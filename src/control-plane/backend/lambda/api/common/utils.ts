/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

import { Route, RouteTable, RouteTableAssociation, Tag, VpcEndpoint, SecurityGroupRule, VpcEndpointType } from '@aws-sdk/client-ec2';
import { ipv4 as ip } from 'cidr-block';
import { JSONPath } from 'jsonpath-plus';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { amznRequestContextHeader } from './constants';
import {
  ALBLogServiceAccountMapping,
  CORS_ORIGIN_DOMAIN_PATTERN,
  EMAIL_PATTERN,
  IP_PATTERN,
  OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_ARN,
  ServerlessRedshiftRPUByRegionMapping,
  SERVICE_CATALOG_SUPPORTED_REGIONS,
} from './constants-ln';
import { ConditionCategory, MetadataValueType } from './explore-types';
import { BuiltInTagKeys } from './model-ln';
import { logger } from './powertools';
import { ALBRegionMappingObject, BucketPrefix, ClickStreamBadRequestError, ClickStreamSubnet, DataCollectionSDK, IUserRole, PipelineStackType, PipelineStatus, RPURange, RPURegionMappingObject, ReportingDashboardOutput, SubnetType } from './types';
import { IMetadataRaw, IMetadataRawValue, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute, IMetadataAttributeValue } from '../model/metadata';
import { CPipelineResources, IPipeline } from '../model/pipeline';
import { IUserSettings } from '../model/user';
import { UserService } from '../service/user';

const userService: UserService = new UserService();

function isEmpty(a: any): boolean {
  if (a === '') return true; //Verify empty string
  if (a === 'null') return true; //Verify null string
  if (a === 'undefined') return true; //Verify undefined string
  if (!a && a !== 0 && a !== '') return true; //Verify undefined and null
  if (Array.prototype.isPrototypeOf(a) && a.length === 0) return true; //Verify empty array
  if (Object.prototype.isPrototypeOf(a) && Object.keys(a).length === 0) return true; //Verify empty objects
  return false;
}

function isEmail(str: string): boolean {
  if (isEmpty(str)) {
    return false;
  }
  const regexp = new RegExp(EMAIL_PATTERN);
  const match = str.match(regexp);
  if (!match || str !== match[0]) {
    return false;
  }
  return true;
}

function tryToJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch (error) {
    return s;
  }
}

function getValueFromTags(tag: string, tags: Tag[]): string {
  if (!isEmpty(tags)) {
    for (let index in tags) {
      if (tags[index].Key === tag) {
        return tags[index].Value ?? '';
      }
    }
  }
  return '';
}

function getALBLogServiceAccount(region: string) {
  const ALBRegionMapping = ALBLogServiceAccountMapping.mapping as ALBRegionMappingObject;
  for (let key in ALBRegionMapping) {
    if (key === region) {
      return ALBRegionMapping[key].account;
    }
  }
  return undefined;
}

function getServerlessRedshiftRPU(region: string): RPURange {
  const RPUMapping = ServerlessRedshiftRPUByRegionMapping as RPURegionMappingObject;
  for (let key in RPUMapping) {
    if (key === region) {
      return RPUMapping[key];
    }
  }
  return { min: 0, max: 0 } as RPURange;
}

function deserializeContext(contextStr: string | undefined) {
  let context;
  try {
    if (contextStr) {
      context = JSON.parse(contextStr);
    }
  } catch (err) {
    logger.warn('Invalid context', {
      contextStr,
      err,
    });
  }
  return context;
}

function getEmailFromRequestContext(requestContext: string | undefined) {
  let email = '';
  try {
    if (requestContext) {
      // Api Gateway pass the request context to the backend
      const context = JSON.parse(requestContext);
      email = context.authorizer.email ?? '';
    }
  } catch (err) {
    logger.warn('unknown user', {
      requestContext,
      err,
    });
  }
  return email;
}

function getTokenFromRequestContext(requestContext: string | undefined) {
  let token = '';
  try {
    if (requestContext) {
      // Api Gateway pass the request context to the backend
      const context = JSON.parse(requestContext);
      token = context.authorizer.authorizationToken ?? '';
    }
  } catch (err) {
    logger.warn('unknown user', {
      requestContext,
      err,
    });
  }
  return token;
}

function getUidFromTokenPayload(payload: JwtPayload | undefined) {
  if (!payload) {
    return '';
  }
  return payload.email || payload.username || payload.preferred_username || payload.sub || '';
}

function getTokenFromRequest(req: any) {
  try {
    let authorization;
    const WITH_AUTH_MIDDLEWARE = process.env.WITH_AUTH_MIDDLEWARE;
    if (WITH_AUTH_MIDDLEWARE === 'true') {
      authorization = req.get('authorization');
    } else {
      authorization = getTokenFromRequestContext(req.get(amznRequestContextHeader));
    }
    if (authorization) {
      const token = authorization.split(' ')[1];
      const decodedToken = jwt.decode(token, { complete: true });
      return decodedToken;
    }
    return undefined;
  } catch (err) {
    logger.warn('Error when get token from request.', { error: err });
    return undefined;
  }
}

async function getRoleFromToken(decodedToken: any) {
  if (!decodedToken) {
    return [];
  }

  let oidcRoles: string[] = [];

  const userSettings = await userService.getUserSettingsFromDDB();
  const values = JSONPath({ path: userSettings.roleJsonPath, json: decodedToken });
  if (Array.prototype.isPrototypeOf(values) && values.length > 0) {
    oidcRoles = values[0] as string[];
  } else {
    return [];
  }

  return mapToRoles(userSettings, oidcRoles);
}

function mapToRoles(userSettings: IUserSettings, oidcRoles: string[]) {
  const userRoles: IUserRole[] = [];
  if (isEmpty(oidcRoles)) {
    return userRoles;
  }
  const adminRoleNames = userSettings.adminRoleNames.split(',').map(role => role.trim());
  const operatorRoleNames = userSettings.operatorRoleNames.split(',').map(role => role.trim());
  const analystRoleNames = userSettings.analystRoleNames.split(',').map(role => role.trim());
  const analystReaderRoleNames = userSettings.analystReaderRoleNames.split(',').map(role => role.trim());

  if (oidcRoles.some(role => adminRoleNames.includes(role))) {
    userRoles.push(IUserRole.ADMIN);
  }
  if (oidcRoles.some(role => operatorRoleNames.includes(role))) {
    userRoles.push(IUserRole.OPERATOR);
  }
  if (oidcRoles.some(role => analystRoleNames.includes(role))) {
    userRoles.push(IUserRole.ANALYST);
  }
  if (oidcRoles.some(role => analystReaderRoleNames.includes(role))) {
    userRoles.push(IUserRole.ANALYST_READER);
  }
  return userRoles;
}

function getBucketPrefix(projectId: string, key: BucketPrefix, value: string | undefined): string {
  if (isEmpty(value) || value === '/') {
    const prefixes: Map<string, string> = new Map();
    prefixes.set(BucketPrefix.LOGS_ALB, `clickstream/${projectId}/logs/alb/`);
    prefixes.set(BucketPrefix.LOGS_KAFKA_CONNECTOR, `clickstream/${projectId}/logs/kafka-connector/`);
    prefixes.set(BucketPrefix.DATA_BUFFER, `clickstream/${projectId}/data/buffer/`);
    prefixes.set(BucketPrefix.DATA_ODS, `clickstream/${projectId}/data/ods/`);
    prefixes.set(BucketPrefix.LOAD_WORKFLOW, `clickstream/${projectId}/data/load-workflow/`);
    prefixes.set(BucketPrefix.DATA_PIPELINE_TEMP, `clickstream/${projectId}/data/pipeline-temp/`);
    prefixes.set(BucketPrefix.KAFKA_CONNECTOR_PLUGIN, `clickstream/${projectId}/runtime/ingestion/kafka-connector/plugins/`);
    return prefixes.get(key) ?? '';
  }
  return value!;
}

function getStackName(pipelineId: string, key: PipelineStackType, sinkType: string): string {
  const names: Map<string, string> = new Map();
  names.set(PipelineStackType.INGESTION, `Clickstream-${PipelineStackType.INGESTION}-${sinkType}-${pipelineId}`);
  names.set(PipelineStackType.KAFKA_CONNECTOR, `Clickstream-${PipelineStackType.KAFKA_CONNECTOR}-${pipelineId}`);
  names.set(PipelineStackType.DATA_PROCESSING, `Clickstream-${PipelineStackType.DATA_PROCESSING}-${pipelineId}`);
  names.set(PipelineStackType.DATA_MODELING_REDSHIFT, `Clickstream-${PipelineStackType.DATA_MODELING_REDSHIFT}-${pipelineId}`);
  names.set(PipelineStackType.REPORTING, `Clickstream-${PipelineStackType.REPORTING}-${pipelineId}`);
  names.set(PipelineStackType.METRICS, `Clickstream-${PipelineStackType.METRICS}-${pipelineId}`);
  names.set(PipelineStackType.ATHENA, `Clickstream-${PipelineStackType.ATHENA}-${pipelineId}`);
  names.set(PipelineStackType.APP_REGISTRY, `Clickstream-${PipelineStackType.APP_REGISTRY}-${pipelineId}`);
  return names.get(key) ?? '';
}

function replaceTemplateVersion(templateUrl: string, version: string): string {
  const templateUrlSubstrings = templateUrl.split('/');
  const urlPrefix = templateUrlSubstrings.slice(0, 4);
  const urlSuffix = templateUrlSubstrings.slice(templateUrlSubstrings.length - 2, templateUrlSubstrings.length);
  return `${urlPrefix.join('/')}/${version}/${urlSuffix.join('/')}`;
};

function getKafkaTopic(pipeline: IPipeline): string {
  let kafkaTopic = pipeline.projectId;
  if (!isEmpty(pipeline.ingestionServer.sinkKafka?.topic)) {
    kafkaTopic = pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId;
  }
  return kafkaTopic;
}

function getPluginInfo(pipeline: IPipeline, resources: CPipelineResources) {
  const transformerAndEnrichClassNames: string[] = [];
  const s3PathPluginJars: string[] = [];
  let s3PathPluginFiles: string[] = [];
  // Transformer
  const { transformerClassNames, transformerPluginJars, transformerPluginFiles } = _getTransformerPluginInfo(pipeline, resources);
  transformerAndEnrichClassNames.push(...transformerClassNames);
  s3PathPluginJars.push(...transformerPluginJars);
  s3PathPluginFiles.push(...transformerPluginFiles);
  // Enrich
  if (pipeline.dataProcessing?.enrichPlugin) {
    for (let enrichPluginId of pipeline.dataProcessing?.enrichPlugin) {
      const { classNames, pluginJars, pluginFiles } = _getEnrichPluginInfo(resources, enrichPluginId);
      transformerAndEnrichClassNames.push(...classNames);
      s3PathPluginJars.push(...pluginJars);
      s3PathPluginFiles.push(...pluginFiles);
    }
  }

  return {
    transformerAndEnrichClassNames,
    s3PathPluginJars,
    s3PathPluginFiles,
  };
}

function _getEnrichPluginInfo(resources: CPipelineResources, enrichPluginId: string) {
  const classNames: string[] = [];
  const pluginJars: string[] = [];
  const pluginFiles: string[] = [];
  const enrich = resources.plugins?.filter(p => p.id === enrichPluginId)[0];
  if (!enrich?.id.startsWith('BUILT-IN')) {
    if (enrich?.jarFile) {
      pluginJars.push(enrich?.jarFile);
    }
    if (enrich?.dependencyFiles) {
      pluginFiles.push(...enrich?.dependencyFiles);
    }
  }
  if (enrich?.mainFunction) {
    classNames.push(enrich?.mainFunction);
  }
  return { classNames, pluginJars, pluginFiles };
}

function _getTransformerPluginInfo(pipeline: IPipeline, resources: CPipelineResources) {
  let transformerClassNames: string[] = [];
  let transformerPluginJars: string[] = [];
  let transformerPluginFiles: string[] = [];
  if (!pipeline.dataProcessing?.transformPlugin ) {
    if (pipeline.dataCollectionSDK === DataCollectionSDK.CLICKSTREAM) {
      const defaultTransformer = resources.plugins?.filter(p => p.id === 'BUILT-IN-1')[0];
      if (defaultTransformer?.mainFunction) {
        transformerClassNames.push(defaultTransformer?.mainFunction);
      }
    } else {
      throw new ClickStreamBadRequestError('Transform plugin is required.');
    }
  } else {
    const { classNames, pluginJars, pluginFiles } = _getTransformerPluginInfoFromResources(resources, pipeline.dataProcessing?.transformPlugin);
    transformerClassNames= transformerClassNames.concat(classNames);
    transformerPluginJars = transformerPluginJars.concat(pluginJars);
    transformerPluginFiles = transformerPluginFiles.concat(pluginFiles);
  }
  return { transformerClassNames, transformerPluginJars, transformerPluginFiles };
}

function _getTransformerPluginInfoFromResources(resources: CPipelineResources, transformPluginId: string) {
  const classNames: string[] = [];
  const pluginJars: string[] = [];
  const pluginFiles: string[] = [];
  const transform = resources.plugins?.filter(p => p.id === transformPluginId)[0];
  if (!transform?.id.startsWith('BUILT-IN')) {
    if (transform?.jarFile) {
      pluginJars.push(transform?.jarFile);
    }
    if (transform?.dependencyFiles) {
      pluginFiles.push(...transform?.dependencyFiles);
    }
  }
  if (transform?.mainFunction) {
    classNames.push(transform?.mainFunction);
  }
  return { classNames, pluginJars, pluginFiles };
}

function getSubnetType(routeTable: RouteTable) {
  const routes = routeTable.Routes;
  let subnetType = SubnetType.ISOLATED;
  for (let route of routes as Route[]) {
    if (route.GatewayId?.startsWith('igw-')) {
      subnetType = SubnetType.PUBLIC;
      break;
    }
    if (route.DestinationCidrBlock === '0.0.0.0/0') {
      subnetType = SubnetType.PRIVATE;
      break;
    }
  }
  return subnetType;
}

function getSubnetRouteTable(routeTables: RouteTable[], subnetId: string) {
  let mainRouteTable: RouteTable = {};
  let subnetRouteTable: RouteTable = {};
  for (let routeTable of routeTables) {
    for (let association of routeTable.Associations as RouteTableAssociation[]) {
      if (association.Main) {
        mainRouteTable = routeTable;
      } else if (association.SubnetId === subnetId) {
        subnetRouteTable = routeTable;
      }
    }
  }
  return !isEmpty(subnetRouteTable) ? subnetRouteTable : mainRouteTable;
}

function checkVpcEndpoint(
  allSubnets: ClickStreamSubnet[],
  isolatedSubnetsAZ: string[],
  routeTable: RouteTable,
  vpcEndpoints: VpcEndpoint[],
  securityGroupsRules: SecurityGroupRule[],
  subnet: ClickStreamSubnet,
  services: string[]) {
  const vpcEndpointServices = vpcEndpoints.map(endpoint => endpoint.ServiceName!);
  const invalidServices = [];
  for (let service of services) {
    const index = vpcEndpointServices.indexOf(service);
    if (index === -1) {
      invalidServices.push({
        service: service,
        reason: 'Miss vpc endpoint',
      });
    } else {
      const vpcEndpoint = vpcEndpoints[index];
      if (vpcEndpoint?.VpcEndpointType === VpcEndpointType.Gateway) {
        if (!checkRoutesGatewayId(routeTable.Routes!, vpcEndpoint.VpcEndpointId!)) {
          invalidServices.push({
            service: service,
            reason: 'The route of vpc endpoint need attached in the route table',
          });
        }
      } else if (vpcEndpoint?.VpcEndpointType === VpcEndpointType.Interface && vpcEndpoint.Groups) {
        invalidServices.push(..._checkInterfaceEndpoint(allSubnets, isolatedSubnetsAZ, vpcEndpoint, service, securityGroupsRules, subnet));
      }
    }
  }
  return invalidServices;
}

function _checkInterfaceEndpoint(allSubnets: ClickStreamSubnet[], isolatedSubnetsAZ: string[], vpcEndpoint: VpcEndpoint,
  service: string, securityGroupsRules: SecurityGroupRule[], subnet: ClickStreamSubnet) {
  const invalidServices = [];
  if (!checkInterfaceVPCEndpointSubnets(allSubnets, isolatedSubnetsAZ, vpcEndpoint)) {
    invalidServices.push({
      service: service,
      reason: `The Availability Zones (AZ) of VPC Endpoint (${service}) subnets must contain Availability Zones (AZ) of isolated subnets.`,
    });
  }
  const vpcEndpointSGIds = vpcEndpoint.Groups?.map(g => g.GroupId!);
  const vpcEndpointSGRules = securityGroupsRules.filter(rule => vpcEndpointSGIds?.includes(rule.GroupId!));
  const vpcEndpointRule: SecurityGroupRule = {
    IsEgress: false,
    IpProtocol: 'tcp',
    FromPort: 443,
    ToPort: 443,
    CidrIpv4: subnet.cidr,
  };
  if (!containRule(vpcEndpointSGIds ?? [], vpcEndpointSGRules, vpcEndpointRule)) {
    invalidServices.push({
      service: service,
      reason: 'The traffic is not allowed by security group rules',
    });
  }
  if (!_isAllowAllIngressTrafficFromSubnets(vpcEndpointSGRules, subnet)) {
    invalidServices.push({
      service: service,
      reason: `The ingress traffic from subnet(${subnet.id}) is not allowed by security group rules`,
    });
  }
  return invalidServices;
}

function checkInterfaceVPCEndpointSubnets(allSubnets: ClickStreamSubnet[], isolatedSubnetsAZ: string[], vpcEndpoint: VpcEndpoint) {
  const vpceSubnets = allSubnets.filter(subnet => vpcEndpoint.SubnetIds?.includes(subnet.id));
  const vpceSubnetsAZ = getSubnetsAZ(vpceSubnets);
  const azInVpceSubnetsAZ = vpceSubnetsAZ.filter(az => isolatedSubnetsAZ.includes(az));
  if (azInVpceSubnetsAZ.length < isolatedSubnetsAZ.length) {
    return false;
  }
  return true;
}

function checkRoutesGatewayId(routes: Route[], gatewayId: string) {
  let result = false;
  for (let route of routes) {
    if (route.GatewayId === gatewayId) {
      result = true;
      break;
    }
  }
  return result;
}

function containRule(securityGroups: string[], securityGroupsRules: SecurityGroupRule[], rule: SecurityGroupRule) {
  for (let securityGroupsRule of securityGroupsRules) {
    if (allowAllTraffic(securityGroupsRule, rule.IsEgress ?? false)) {
      return true;
    }
    if (!_isRuleMatch(securityGroupsRule, rule, securityGroups)) {continue;}
    return true;
  }
  return false;
}

function allowAllTraffic(securityGroupsRule: SecurityGroupRule, isEgress: boolean) {
  if (securityGroupsRule.IsEgress === isEgress
    && securityGroupsRule.IpProtocol === '-1'
    && securityGroupsRule.FromPort === -1
    && securityGroupsRule.ToPort === -1
    && securityGroupsRule.CidrIpv4 === '0.0.0.0/0') {
    return true;
  }
  return false;
}

function _isRuleMatch(securityGroupsRule: SecurityGroupRule, rule: SecurityGroupRule, securityGroups?: string[]) {
  if (!_isRulesMatch2(securityGroupsRule, rule)) {return false;}

  if (securityGroupsRule.CidrIpv4 !== '0.0.0.0/0') {
    if (securityGroupsRule.CidrIpv4 && rule.CidrIpv4) {
      const securityGroupsRuleCidr = ip.cidr(securityGroupsRule.CidrIpv4);
      const ruleCidr = ip.cidr(rule.CidrIpv4);
      if (!securityGroupsRuleCidr.includes(ruleCidr.firstUsableIp) || !securityGroupsRuleCidr.includes(ruleCidr.lastUsableIp)) {
        return false;
      }
    } else if (securityGroupsRule.ReferencedGroupInfo?.GroupId) {
      if (!securityGroups?.includes(securityGroupsRule.ReferencedGroupInfo.GroupId)) {
        return false;
      }
    }
  }
  return true;
}

function _isRulesMatch2(securityGroupsRule: SecurityGroupRule, rule: SecurityGroupRule) {
  if (securityGroupsRule.IsEgress !== rule.IsEgress) {
    return false;
  }
  if (securityGroupsRule.IpProtocol !== '-1' && securityGroupsRule.IpProtocol !== rule.IpProtocol) {
    return false;
  }
  if (securityGroupsRule.FromPort! !== -1 && securityGroupsRule.ToPort! !== -1
    && (securityGroupsRule.FromPort! > rule.FromPort! || securityGroupsRule.ToPort! < rule.ToPort!)) {
    return false;
  }

  return true;
}

function _isAllowAllIngressTrafficFromSubnets(securityGroupsRules: SecurityGroupRule[], subnet: ClickStreamSubnet) {
  const subnetCidrRule: SecurityGroupRule = {
    IsEgress: false,
    IpProtocol: 'tcp',
    FromPort: 443,
    ToPort: 443,
    CidrIpv4: subnet.cidr,
  };
  return containRule([], securityGroupsRules, subnetCidrRule);
}

function getSubnetsAZ(subnets: ClickStreamSubnet[]) {
  const azArray = new Array<string>();
  for (let subnet of subnets) {
    if (!azArray.includes(subnet.availabilityZone)) {
      azArray.push(subnet.availabilityZone);
    }
  }
  return azArray;
}

function paginateData(data: any[], pagination: boolean, pageSize: number, pageNumber: number) {
  const totalCount = data.length;
  if (pagination) {
    if (totalCount) {
      pageNumber = Math.min(Math.ceil(totalCount / pageSize), pageNumber);
      const startIndex = pageSize * (pageNumber - 1);
      const endIndex = Math.min(pageSize * pageNumber, totalCount);
      return data?.slice(startIndex, endIndex);
    }
  }
  return data;
}

function getValueFromStackOutputSuffix(pipeline: IPipeline, stackType: PipelineStackType, suffix: string) {
  const stackName = getStackName(pipeline.pipelineId, stackType, pipeline.ingestionServer.sinkType);
  return `#.${stackName}.${suffix}`;
}

function getStackOutputFromPipelineStatus(status: PipelineStatus, stackType: PipelineStackType, key: string): string {
  if (isEmpty(status)) {
    return '';
  }
  const stackTypes = status.stackDetails.map(s => s.stackType);
  if (!stackTypes.includes(stackType)) {
    return '';
  }
  for (let stackDetail of status.stackDetails) {
    if (stackDetail.stackType === stackType) {
      const outputs = stackDetail.outputs;
      for (let output of outputs) {
        if (output.OutputKey?.endsWith(key)) {
          return output.OutputValue ?? '';
        }
      }
    }
  }
  return '';
}

function getVersionFromTags(tags: Tag[] | undefined) {
  let version = '';
  if (!tags) {
    return version;
  }
  const versionTag = tags.filter(t => t.Key === BuiltInTagKeys.AWS_SOLUTION_VERSION);
  if (versionTag.length > 0) {
    version = versionTag[0].Value ?? '';
  }
  return version;
}

function getReportingDashboardsUrl(status: PipelineStatus, stackType: PipelineStackType, key: string): ReportingDashboardOutput[] {
  let dashboards: ReportingDashboardOutput[] = [];
  const dashboardsOutputs = getStackOutputFromPipelineStatus(
    status,
    stackType,
    key,
  );
  if (dashboardsOutputs) {
    try {
      dashboards = JSON.parse(dashboardsOutputs);
    } catch (error) {
      logger.warn('Reporting Outputs error.', { dashboardsOutputs });
    }
  }
  return dashboards;
}

function corsStackInput(cors: string) {
  const inputs: string[] = [];
  // replace all whitespace
  const corsString = cors.replace(/\s/g, '');
  // split by comma
  const corsArray = corsString.split(',');
  for (let c of corsArray) {
    const regexpIP = new RegExp(IP_PATTERN);
    const matchIP = c.match(regexpIP);
    if (matchIP) {
      inputs.push(c);
    } else {
      const regexpDomain = new RegExp(CORS_ORIGIN_DOMAIN_PATTERN);
      const matchDomain = c.match(regexpDomain);
      if (matchDomain || c === '*') {
        // replace all . to \.
        // replace all * to .*
        const domain = c.replace(/\./g, '\\.').replace(/\*/g, '\.\*');
        inputs.push(domain);
      } else {
        inputs.push(c);
      }
    }
  }

  return inputs.join('|');
}

function groupAssociatedEventsByName(parameters: IMetadataEventParameter[]): IMetadataEvent[] {
  const groupEvents: IMetadataEvent[] = [];
  for (let parameter of parameters) {
    const existedEvent = groupEvents.find((e: IMetadataEvent) => e.name === parameter.eventName);
    if (!existedEvent) {
      groupEvents.push({
        id: `${parameter.projectId}#${parameter.appId}#${parameter.eventName}`,
        projectId: parameter.projectId,
        appId: parameter.appId,
        name: parameter.eventName,
        prefix: `EVENT#${parameter.projectId}#${parameter.appId}`,
      } as IMetadataEvent);
    }
  }
  return groupEvents;
}

function groupAssociatedEventParametersByName(events: IMetadataEvent[], parameters: IMetadataEventParameter[]): IMetadataEvent[] {
  for (let parameter of parameters) {
    const existedEvent = events.find((e: IMetadataEvent) => e.name === parameter.eventName);
    if (existedEvent) {
      if (!existedEvent.associatedParameters) {
        existedEvent.associatedParameters = [parameter];
        continue;
      }
      let existedParameter = existedEvent.associatedParameters.find(
        (p: IMetadataEventParameter) => p.name === parameter.name && p.valueType === parameter.valueType);
      if (!existedParameter) {
        existedEvent.associatedParameters.push(parameter);
      } else {
        existedParameter = concatEventParameter([existedParameter], [parameter])[0];
      }
    }
  }
  return events;
}

function getCurMonthStr() {
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  return `#${year}${month.toString().padStart(2, '0')}`;
}

function getYesterdayMonthStr() {
  const today = new Date();
  const yesterday = new Date(today.setDate(today.getDate()-1));
  const year = yesterday.getFullYear();
  const month = yesterday.getMonth() + 1;
  return `#${year}${month.toString().padStart(2, '0')}`;
}

function getDataFromYesterday(metadataArray: IMetadataRaw[]) {
  const yesterdayMonth = getYesterdayMonthStr();
  const yesterday = `day${new Date().getDate() - 1}`;
  let hasData = false;
  let dataVolumeLastDay = 0;
  const yesterdayData = metadataArray.filter(m => m.month === yesterdayMonth);
  if (yesterdayData.length > 0) {
    const meta = (yesterdayData[0] as any)[yesterday];
    if (meta) {
      dataVolumeLastDay = meta.count ?? 0;
      hasData = meta.hasData ?? false;
    }
  }
  return { hasData, dataVolumeLastDay };
}

function getLatestEventByName(metadata: IMetadataRaw[]): IMetadataEvent[] {
  const latestEvents: IMetadataEvent[] = [];
  for (let meta of metadata) {
    const lastDayData = getDataFromYesterday([meta]);
    const event: IMetadataEvent = {
      id: meta.id,
      month: meta.month,
      prefix: meta.prefix,
      projectId: meta.projectId,
      appId: meta.appId,
      name: meta.name,
      hasData: lastDayData.hasData,
      platform: meta.summary.platform ?? [],
      sdkVersion: meta.summary.sdkVersion ?? [],
      sdkName: meta.summary.sdkName ?? [],
      dataVolumeLastDay: lastDayData.dataVolumeLastDay,
    };
    const index = latestEvents.findIndex((e: IMetadataEvent) => e.name === meta.name);
    if (index === -1) {
      latestEvents.push(event);
    } else if (meta.month > latestEvents[index].month) {
      latestEvents[index] = event;
    }
  }
  return latestEvents;
}

function getLatestParameterById(metadata: IMetadataRaw[]): IMetadataEventParameter[] {
  const latestEventParameters: IMetadataEventParameter[] = [];
  for (let meta of metadata) {
    const lastDayData = getDataFromYesterday([meta]);
    const parameter: IMetadataEventParameter = {
      id: meta.id,
      month: meta.month,
      prefix: meta.prefix,
      projectId: meta.projectId,
      appId: meta.appId,
      name: meta.name,
      eventName: meta.eventName ?? '',
      hasData: lastDayData.hasData,
      platform: meta.summary.platform ?? [],
      category: meta.category ?? ConditionCategory.OTHER,
      valueType: meta.valueType ?? MetadataValueType.STRING,
      valueEnum: meta.summary.valueEnum ?? [],
    };
    const index = latestEventParameters.findIndex(
      (e: IMetadataEventParameter) => e.name === parameter.name && e.valueType === parameter.valueType);
    if (index === -1) {
      latestEventParameters.push(parameter);
    } else if (parameter.month > latestEventParameters[index].month) {
      latestEventParameters[index] = parameter;
    }
    latestEventParameters.push(parameter);
  }
  return latestEventParameters;
}

function groupByParameterByName(parameters: IMetadataEventParameter[], eventName?: string): IMetadataEventParameter[] {
  const groupParameters: IMetadataEventParameter[] = [];
  for (let parameter of parameters) {
    if (eventName && parameter.eventName !== eventName) {
      continue;
    }
    const index = groupParameters.findIndex(
      (e: IMetadataEventParameter) => e.name === parameter.name && e.valueType === parameter.valueType);
    if (index === -1) {
      groupParameters.push(parameter);
    }
  }
  return groupParameters;
}

function getParameterByNameAndType(metadata: IMetadataRaw[], parameterName: string, category: ConditionCategory, valueType: MetadataValueType):
IMetadataEventParameter | undefined {
  const filteredMetadata = metadata.filter(
    (r: IMetadataRaw) => r.name === parameterName && r.category === category && r.valueType === valueType);
  if (filteredMetadata.length === 0) {
    return;
  }
  const groupEvents: IMetadataEvent[] = [];
  for (let meta of filteredMetadata) {
    const existedEvent = groupEvents.find((e: IMetadataEvent) => e.name === meta.eventName);
    if (!existedEvent) {
      groupEvents.push({
        id: `${meta.projectId}#${meta.appId}#${meta.eventName}`,
        projectId: meta.projectId,
        appId: meta.appId,
        name: meta.eventName,
        prefix: `EVENT#${meta.projectId}#${meta.appId}`,
      } as IMetadataEvent);
    }
  }
  const lastDayData = getDataFromYesterday(filteredMetadata);
  return {
    id: filteredMetadata[0].id,
    month: filteredMetadata[0].month,
    prefix: filteredMetadata[0].prefix,
    projectId: filteredMetadata[0].projectId,
    appId: filteredMetadata[0].appId,
    name: filteredMetadata[0].name,
    eventName: '',
    hasData: lastDayData.hasData,
    platform: filteredMetadata[0].summary.platform ?? [],
    category: filteredMetadata[0].category ?? ConditionCategory.OTHER,
    valueType: filteredMetadata[0].valueType ?? MetadataValueType.STRING,
    valueEnum: filteredMetadata[0].summary.valueEnum ?? [],
    associatedEvents: groupEvents,
  } as IMetadataEventParameter;
}

function getLatestAttributeByName(metadata: IMetadataRaw[]): IMetadataUserAttribute[] {
  const latestUserAttributes: IMetadataUserAttribute[] = [];
  for (let meta of metadata) {
    const attribute: IMetadataUserAttribute = {
      id: meta.id,
      month: meta.month,
      prefix: meta.prefix,
      projectId: meta.projectId,
      appId: meta.appId,
      name: meta.name,
      hasData: meta.summary.hasData ?? false,
      category: meta.category ?? ConditionCategory.OTHER,
      valueType: meta.valueType ?? MetadataValueType.STRING,
      valueEnum: meta.summary.valueEnum ?? [],
    };
    const index = latestUserAttributes.findIndex(
      (e: IMetadataUserAttribute) => e.name === meta.name && e.valueType === meta.valueType);
    if (index === -1) {
      latestUserAttributes.push(attribute);
    } else if (meta.month > latestUserAttributes[index].month) {
      latestUserAttributes[index] = attribute;
    }
  }
  return latestUserAttributes;
}

function getAttributeByNameAndType(metadata: IMetadataRaw[], attributeName: string, valueType: MetadataValueType):
IMetadataUserAttribute | undefined {
  const filteredMetadata = metadata.filter((r: IMetadataRaw) => r.name === attributeName && r.valueType === valueType);
  if (filteredMetadata.length === 0) {
    return;
  }
  const lastDayData = getDataFromYesterday(filteredMetadata);
  return {
    id: filteredMetadata[0].id,
    month: filteredMetadata[0].month,
    prefix: filteredMetadata[0].prefix,
    projectId: filteredMetadata[0].projectId,
    appId: filteredMetadata[0].appId,
    name: filteredMetadata[0].name,
    hasData: lastDayData.hasData,
    category: filteredMetadata[0].category ?? ConditionCategory.USER,
    valueType: filteredMetadata[0].valueType ?? MetadataValueType.STRING,
    valueEnum: filteredMetadata[0].summary.valueEnum ?? [],
  } as IMetadataUserAttribute;
}

function concatEventParameter(
  associated: IMetadataEventParameter[] | undefined, parameters: IMetadataEventParameter[] | undefined): IMetadataEventParameter[] {
  const concatEventParameters: IMetadataEventParameter[] = associated ?? [];
  if (!parameters) {
    return concatEventParameters;
  }
  for (let parameter of parameters) {
    const existedParameter = concatEventParameters.find(
      (p: IMetadataEventParameter) => p.name === parameter.name && p.valueType === parameter.valueType);
    if (!existedParameter) {
      concatEventParameters.push(parameter);
    } else {
      existedParameter.valueEnum = uniqueParameterValueEnum(existedParameter.valueEnum, parameter.valueEnum).sort(
        (a, b) => a.count > b.count ? -1 : 1);
    }
  }
  return concatEventParameters;
}

function uniqueParameterValueEnum(e: IMetadataRawValue[] | undefined, n: IMetadataRawValue[] | undefined) {
  const existedValues = e ?? [];
  const newValues = n ?? [];
  const values = existedValues.concat(newValues);
  const res = new Map();
  return values.filter((item) => !res.has(item.value) && res.set(item.value, 1));
}

function pathNodesToAttribute(nodes: IMetadataRawValue[] | undefined) {
  if (!nodes) {
    return [];
  }
  const pathNodes: IMetadataAttributeValue[] = [];
  for (let n of nodes) {
    pathNodes.push({
      value: n.value,
      displayValue: n.value,
    });
  }
  return pathNodes;
}

function getAppRegistryApplicationArn(pipeline: IPipeline): string {
  return SERVICE_CATALOG_SUPPORTED_REGIONS.includes(pipeline.region) ?
    getValueFromStackOutputSuffix(pipeline, PipelineStackType.APP_REGISTRY, OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_ARN) : '';
}

export {
  isEmpty,
  isEmail,
  tryToJson,
  getValueFromTags,
  getALBLogServiceAccount,
  getServerlessRedshiftRPU,
  getEmailFromRequestContext,
  getTokenFromRequestContext,
  getBucketPrefix,
  getStackName,
  getKafkaTopic,
  getPluginInfo,
  getSubnetType,
  getSubnetRouteTable,
  checkVpcEndpoint,
  containRule,
  getSubnetsAZ,
  paginateData,
  replaceTemplateVersion,
  getValueFromStackOutputSuffix,
  getStackOutputFromPipelineStatus,
  getReportingDashboardsUrl,
  corsStackInput,
  getRoleFromToken,
  getUidFromTokenPayload,
  getTokenFromRequest,
  getLatestEventByName,
  getLatestParameterById,
  groupByParameterByName,
  groupAssociatedEventsByName,
  groupAssociatedEventParametersByName,
  getLatestAttributeByName,
  getParameterByNameAndType,
  getAttributeByNameAndType,
  getDataFromYesterday,
  pathNodesToAttribute,
  getCurMonthStr,
  getVersionFromTags,
  getAppRegistryApplicationArn,
  deserializeContext,
};

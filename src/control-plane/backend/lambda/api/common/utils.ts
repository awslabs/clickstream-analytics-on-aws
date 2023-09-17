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
import { ALBLogServiceAccountMapping, CORS_ORIGIN_DOMAIN_PATTERN, EMAIL_PATTERN, IP_PATTERN, ServerlessRedshiftRPUByRegionMapping } from './constants-ln';
import { logger } from './powertools';
import { ALBRegionMappingObject, BucketPrefix, ClickStreamSubnet, IUserRole, PipelineStackType, PipelineStatus, RPURange, RPURegionMappingObject, ReportingDashboardOutput, SubnetType } from './types';
import { IMetadataAttributeValue, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';
import { CPipelineResources, IPipeline } from '../model/pipeline';
import { IUserSettings } from '../model/user';
import { UserServ } from '../service/user';

const userServ: UserServ = new UserServ();

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

function generateRandomStr(length: number) {
  let randomString = '';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomString += letters[randomIndex];
  }
  return randomString;
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
  let role = IUserRole.NO_IDENTITY;
  if (!decodedToken) {
    return role;
  }

  let oidcRoles: string[] = [];

  const userSettings = await userServ.getUserSettingsFromDDB();
  if (isEmpty(userSettings.roleJsonPath) || isEmpty(userSettings.operatorRoleNames) || isEmpty(userSettings.analystRoleNames)) {
    return role;
  }

  const values = JSONPath({ path: userSettings.roleJsonPath, json: decodedToken });
  if (Array.prototype.isPrototypeOf(values) && values.length > 0) {
    oidcRoles = values[0] as string[];
  } else {
    return role;
  }

  return mapToRole(userSettings, oidcRoles);
}

function mapToRole(userSettings: IUserSettings, oidcRoles: string[]) {
  if (isEmpty(oidcRoles)) {
    return IUserRole.NO_IDENTITY;
  }
  const operatorRoleNames = userSettings.operatorRoleNames.split(',').map(role => role.trim());
  const analystRoleNames = userSettings.analystRoleNames.split(',').map(role => role.trim());

  if (oidcRoles.some(role => operatorRoleNames.includes(role)) && oidcRoles.some(role => analystRoleNames.includes(role))) {
    return IUserRole.ADMIN;
  }
  if (oidcRoles.some(role => operatorRoleNames.includes(role))) {
    return IUserRole.OPERATOR;
  }
  if (oidcRoles.some(role => analystRoleNames.includes(role))) {
    return IUserRole.ANALYST;
  }
  return IUserRole.NO_IDENTITY;
}

function getBucketPrefix(projectId: string, key: BucketPrefix, value: string | undefined): string {
  if (isEmpty(value) || value === '/') {
    const prefixs: Map<string, string> = new Map();
    prefixs.set(BucketPrefix.LOGS_ALB, `clickstream/${projectId}/logs/alb/`);
    prefixs.set(BucketPrefix.LOGS_KAFKA_CONNECTOR, `clickstream/${projectId}/logs/kafka-connector/`);
    prefixs.set(BucketPrefix.DATA_BUFFER, `clickstream/${projectId}/data/buffer/`);
    prefixs.set(BucketPrefix.DATA_ODS, `clickstream/${projectId}/data/ods/`);
    prefixs.set(BucketPrefix.DATA_PIPELINE_TEMP, `clickstream/${projectId}/data/pipeline-temp/`);
    prefixs.set(BucketPrefix.KAFKA_CONNECTOR_PLUGIN, `clickstream/${projectId}/runtime/ingestion/kafka-connector/plugins/`);
    return prefixs.get(key) ?? '';
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
  return names.get(key) ?? '';
}

function replaceTemplateVersion(templateUrl: string, version: string): string {
  const templateUrlSubstrings = templateUrl.split('/');
  const urlPreffix = templateUrlSubstrings.slice(0, 4);
  const urlSuffix = templateUrlSubstrings.slice(templateUrlSubstrings.length - 2, templateUrlSubstrings.length);
  return `${urlPreffix.join('/')}/${version}/${urlSuffix.join('/')}`;
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
  if (!isEmpty(pipeline.dataProcessing?.transformPlugin) && !pipeline.dataProcessing?.transformPlugin?.startsWith('BUILT-IN')) {
    const transformer = resources.plugins?.filter(p => p.id === pipeline.dataProcessing?.transformPlugin)[0];
    if (transformer?.mainFunction) {
      transformerAndEnrichClassNames.push(transformer?.mainFunction);
    }
    if (transformer?.jarFile) {
      s3PathPluginJars.push(transformer?.jarFile);
    }
    if (transformer?.dependencyFiles) {
      s3PathPluginFiles = s3PathPluginFiles.concat(transformer?.dependencyFiles);
    }
  } else {
    let defaultTransformer = resources.plugins?.filter(p => p.id === 'BUILT-IN-1')[0];
    if (defaultTransformer?.mainFunction) {
      transformerAndEnrichClassNames.push(defaultTransformer?.mainFunction);
    }
  }
  // Enrich
  if (pipeline.dataProcessing?.enrichPlugin) {
    for (let enrichPluginId of pipeline.dataProcessing?.enrichPlugin) {
      const enrich = resources.plugins?.filter(p => p.id === enrichPluginId)[0];
      if (!enrich?.id.startsWith('BUILT-IN')) {
        if (enrich?.jarFile) {
          s3PathPluginJars.push(enrich?.jarFile);
        }
        if (enrich?.dependencyFiles) {
          s3PathPluginFiles = s3PathPluginFiles.concat(enrich?.dependencyFiles);
        }
      }
      if (enrich?.mainFunction) {
        transformerAndEnrichClassNames.push(enrich?.mainFunction);
      }
    }
  }

  return {
    transformerAndEnrichClassNames,
    s3PathPluginJars,
    s3PathPluginFiles,
  };
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
        if (!checkInterfaceVPCEndpointSubnets(allSubnets, isolatedSubnetsAZ, vpcEndpoint)) {
          invalidServices.push({
            service: service,
            reason: `The Availability Zones (AZ) of VPC Endpoint (${service}) subnets must contain Availability Zones (AZ) of isolated subnets.`,
          });
        }
        const vpcEndpointSGIds = vpcEndpoint.Groups?.map(g => g.GroupId!);
        const vpcEndpointSGRules = securityGroupsRules.filter(rule => vpcEndpointSGIds.includes(rule.GroupId!));
        const vpcEndpointRule: SecurityGroupRule = {
          IsEgress: false,
          IpProtocol: 'tcp',
          FromPort: 443,
          ToPort: 443,
          CidrIpv4: subnet.cidr,
        };
        if (!containRule(vpcEndpointSGIds, vpcEndpointSGRules, vpcEndpointRule)) {
          invalidServices.push({
            service: service,
            reason: 'The traffic is not allowed by security group rules',
          });
        }
      }
    }
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
    if (securityGroupsRule.IsEgress === rule.IsEgress
      && securityGroupsRule.IpProtocol === '-1'
      && securityGroupsRule.FromPort === -1
      && securityGroupsRule.ToPort === -1
      && securityGroupsRule.CidrIpv4 === '0.0.0.0/0') {
      return true;
    }
    if (securityGroupsRule.IsEgress !== rule.IsEgress) {
      continue;
    }
    if (securityGroupsRule.IpProtocol !== '-1' && securityGroupsRule.IpProtocol !== rule.IpProtocol) {
      continue;
    }
    if (securityGroupsRule.FromPort! !== -1 && securityGroupsRule.ToPort! !== -1
      && (securityGroupsRule.FromPort! > rule.FromPort! || securityGroupsRule.ToPort! < rule.ToPort!)) {
      continue;
    }
    if (securityGroupsRule.CidrIpv4 === '0.0.0.0/0') {
      return true;
    } else if (securityGroupsRule.CidrIpv4 && rule.CidrIpv4) {
      const securityGroupsRuleCidr = ip.cidr(securityGroupsRule.CidrIpv4);
      const ruleCidr = ip.cidr(rule.CidrIpv4);
      if (!securityGroupsRuleCidr.includes(ruleCidr.firstUsableIp) || !securityGroupsRuleCidr.includes(ruleCidr.lastUsableIp)) {
        continue;
      }
    } else if (securityGroupsRule.ReferencedGroupInfo?.GroupId) {
      if (!securityGroups.includes(securityGroupsRule.ReferencedGroupInfo.GroupId)) {
        continue;
      }
    }

    return true;
  }
  return false;
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
};

function groupAssociatedEventParametersByName(events: IMetadataEvent[], parameters: IMetadataEventParameter[]): IMetadataEvent[] {
  for (let parameter of parameters) {
    const existedEvent = events.find((e: IMetadataEvent) => e.name === parameter.eventName);
    if (existedEvent) {
      if (!existedEvent.associatedParameters) {
        existedEvent.associatedParameters = [parameter];
        continue;
      }
      let existedParameter = existedEvent.associatedParameters.find((p: IMetadataEventParameter) => p.name === parameter.name);
      if (!existedParameter) {
        existedEvent.associatedParameters.push(parameter);
      } else {
        existedParameter = concatEventParameter([existedParameter], [parameter])[0];
      }
    }
  }
  return events;
};

function groupEventByName(events: IMetadataEvent[]): IMetadataEvent[] {
  const groupEvents: IMetadataEvent[] = [];
  for (let event of events) {
    const existedEvent = groupEvents.find((e: IMetadataEvent) => e.name === event.name);
    if (!existedEvent) {
      groupEvents.push(event);
    } else {
      existedEvent.hasData = existedEvent.hasData || event.hasData;
      existedEvent.platform = [...new Set(existedEvent.platform.concat(event.platform))];
      if (event.associatedParameters || existedEvent.associatedParameters) {
        existedEvent.associatedParameters = concatEventParameter(existedEvent.associatedParameters, event.associatedParameters);
      }
    }
  }
  return groupEvents;
};

function groupEventParameterByName(parameters: IMetadataEventParameter[]): IMetadataEventParameter[] {
  const groupEventParameters: IMetadataEventParameter[] = [];
  for (let parameter of parameters) {
    const existedParameter = groupEventParameters.find((e: IMetadataEventParameter) => e.name === parameter.name);
    if (!existedParameter) {
      groupEventParameters.push(parameter);
    } else {
      existedParameter.hasData = existedParameter.hasData || parameter.hasData;
      existedParameter.platform = [...new Set(existedParameter.platform.concat(parameter.platform))];
      existedParameter.valueEnum = uniqueParameterValues(existedParameter.valueEnum, parameter.valueEnum);
    }
  }
  return groupEventParameters;
};

function groupUserAttributeByName(attributes: IMetadataUserAttribute[]): IMetadataUserAttribute[] {
  const groupAttributes: IMetadataUserAttribute[] = [];
  for (let attribute of attributes) {
    const existedAttribute = groupAttributes.find((e: IMetadataUserAttribute) => e.name === attribute.name);
    if (!existedAttribute) {
      groupAttributes.push(attribute);
    } else {
      existedAttribute.hasData = existedAttribute.hasData || attribute.hasData;
      existedAttribute.valueEnum = uniqueParameterValues(existedAttribute.valueEnum, attribute.valueEnum);
    }
  }
  return groupAttributes;
};

function concatEventParameter(
  associated: IMetadataEventParameter[] | undefined, parameters: IMetadataEventParameter[] | undefined): IMetadataEventParameter[] {
  const concatEventParameters: IMetadataEventParameter[] = associated ?? [];
  if (!parameters) {
    return concatEventParameters;
  }
  for (let parameter of parameters) {
    const existedParameter = concatEventParameters.find((p: IMetadataEventParameter) => p.name === parameter.name);
    if (!existedParameter) {
      concatEventParameters.push(parameter);
    } else {
      existedParameter.hasData = existedParameter.hasData || parameter.hasData;
      existedParameter.platform = [...new Set(existedParameter.platform.concat(parameter.platform))];
      existedParameter.valueEnum = uniqueParameterValues(existedParameter.valueEnum, parameter.valueEnum);
    }
  }
  return concatEventParameters;
};

function uniqueParameterValues(e: IMetadataAttributeValue[] | undefined, n: IMetadataAttributeValue[] | undefined) {
  const existedValues = e ?? [];
  const newValues = n ?? [];
  const values = existedValues.concat(newValues);
  const res = new Map();
  return values.filter((item) => !res.has(item.value) && res.set(item.value, 1));
};

export {
  isEmpty,
  isEmail,
  tryToJson,
  getValueFromTags,
  getALBLogServiceAccount,
  getServerlessRedshiftRPU,
  generateRandomStr,
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
  uniqueParameterValues,
  groupEventByName,
  groupAssociatedEventsByName,
  groupAssociatedEventParametersByName,
  groupEventParameterByName,
  groupUserAttributeByName,
};
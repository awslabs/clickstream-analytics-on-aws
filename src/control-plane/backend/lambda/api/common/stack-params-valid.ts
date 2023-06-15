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

import { SecurityGroupRule, VpcEndpoint } from '@aws-sdk/client-ec2';
import { CronDate, parseExpression } from 'cron-parser';
import { REDSHIFT_MODE } from './model-ln';
import { logger } from './powertools';
import { ClickStreamBadRequestError, ClickStreamSubnet, IngestionServerSinkBatchProps, IngestionServerSizeProps, PipelineSinkType, Policy, SubnetType } from './types';
import { checkPolicy, checkVpcEndpoint, containRule, getALBLogServiceAccount, getServerlessRedshiftRPU, getSubnetsAZ, isEmpty } from './utils';
import { CPipelineResources, IPipeline } from '../model/pipeline';
import { describeSecurityGroupsWithRules, describeSubnetsWithType, describeVpcEndpoints, listAvailabilityZones } from '../store/aws/ec2';
import { describeAccountSubscription } from '../store/aws/quicksight';
import { getS3BucketPolicy } from '../store/aws/s3';
import { getSecretValue } from '../store/aws/secretsmanager';

export const validatePattern = (parameter: string, pattern: string, value: string | undefined) => {
  if (!value) {
    throw new ClickStreamBadRequestError(`Validation error: ${parameter}: undefined not match ${pattern}. Please check and try again.`);
  }
  const regexp = new RegExp(pattern);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    throw new ClickStreamBadRequestError(`Validation error: ${parameter}: ${value} not match ${pattern}. Please check and try again.`);
  }
  return true;
};

export const validateSecretModel = async (region: string, key: string, secretArn: string, pattern: string) => {
  try {
    validatePattern(key, pattern, secretArn);
    const secretContent = await getSecretValue(region, secretArn);
    if (!secretContent) {
      throw new ClickStreamBadRequestError('Validation error: AuthenticationSecret is undefined. Please check and try again.');
    }
    const secret = JSON.parse(secretContent);
    const keys = secret.issuer &&
      secret.userEndpoint &&
      secret.authorizationEndpoint &&
      secret.tokenEndpoint &&
      secret.appClientId &&
      secret.appClientSecret;
    if (!keys) {
      throw new ClickStreamBadRequestError('Validation error: AuthenticationSecret format mismatch. Please check and try again.');
    }
  } catch (err) {
    throw new ClickStreamBadRequestError('Validation error: AuthenticationSecret format mismatch. Please check and try again.');
  }
  return true;
};

export const validateServerlessRedshiftRPU = (region: string, rpu: number) => {
  const rpuRange = getServerlessRedshiftRPU(region);
  if (rpuRange.min === 0 || rpuRange.max === 0) {
    throw new ClickStreamBadRequestError('Validation error: the current region does not support ServerlessRedshift.');
  }
  if (rpu % 8 !== 0 || rpu > rpuRange.max || rpu < rpuRange.min) {
    throw new ClickStreamBadRequestError(`Validation error: RPU range must be ${rpuRange.min}-${rpuRange.max} in increments of 8.`);
  }
  return true;
};

export const validatePipelineNetwork = async (pipeline: IPipeline, resources: CPipelineResources) => {
  const network = pipeline.network;
  if (isEmpty(network.privateSubnetIds)) {
    // public subnets only
    // pipeline.network.privateSubnetIds = pipeline.network.publicSubnetIds;
    throw new ClickStreamBadRequestError(
      'Validation error: you must select at least two private subnets for the ingestion endpoint.',
    );
  }
  if (network.publicSubnetIds.length < 2 || network.privateSubnetIds.length < 2) {
    throw new ClickStreamBadRequestError(
      'Validate error: you must select at least two public subnets and at least two private subnets for the ingestion endpoint.',
    );
  }

  const allSubnets = await describeSubnetsWithType(pipeline.region, network.vpcId, SubnetType.ALL);
  const privateSubnets = allSubnets.filter(subnet => network.privateSubnetIds.includes(subnet.id));
  const publicSubnets = allSubnets.filter(subnet => network.publicSubnetIds.includes(subnet.id));
  const privateSubnetsAZ = getSubnetsAZ(privateSubnets);
  const publicSubnetsAZ = getSubnetsAZ(publicSubnets);
  if (publicSubnetsAZ.length < 2 || privateSubnetsAZ.length < 2) {
    throw new ClickStreamBadRequestError(
      'Validate error: the public and private subnets for the ingestion endpoint must locate in at least two Availability Zones (AZ).',
    );
  }
  const azInPublic = publicSubnetsAZ.filter(az => privateSubnetsAZ.includes(az));
  if (azInPublic.length !== privateSubnetsAZ.length) {
    throw new ClickStreamBadRequestError(
      'Validate error: the public subnets and private subnets for ingestion endpoint must be in the same Availability Zones (AZ). '+
      'For example, you can not select public subnets in AZ (a, b), while select private subnets in AZ (b, c).',
    );
  }

  const isolatedSubnets = privateSubnets.filter(subnet => subnet.type == SubnetType.ISOLATED);
  if (isolatedSubnets.length > 0) {
    const isolatedSubnetsAZ = getSubnetsAZ(isolatedSubnets);
    const vpcEndpoints = await describeVpcEndpoints(pipeline.region, network.vpcId);
    const vpcEndpointSecurityGroups: string[] = [];
    for (let vpce of vpcEndpoints) {
      for (let group of vpce.Groups!) {
        vpcEndpointSecurityGroups.push(group.GroupId!);
      }
    }

    const vpcEndpointSecurityGroupRules = await describeSecurityGroupsWithRules(pipeline.region, vpcEndpointSecurityGroups);

    for (let privateSubnet of privateSubnets) {
      if (privateSubnet.type === SubnetType.ISOLATED) {
        validateVpcEndpoint(
          pipeline.region,
          allSubnets,
          isolatedSubnetsAZ,
          privateSubnet,
          vpcEndpoints,
          vpcEndpointSecurityGroupRules,
          [
            's3',
            'logs',
          ]);
        if (pipeline.ingestionServer) {
          const services = [
            'ecr.dkr',
            'ecr.api',
            'ecs',
            'ecs-agent',
            'ecs-telemetry',
          ];
          if (pipeline.ingestionServer.sinkType === PipelineSinkType.KINESIS) {
            services.push('kinesis-streams');
          }
          validateVpcEndpoint(
            pipeline.region,
            allSubnets,
            isolatedSubnetsAZ,
            privateSubnet,
            vpcEndpoints,
            vpcEndpointSecurityGroupRules,
            services);
        }
        if (pipeline.dataProcessing) {
          validateVpcEndpoint(
            pipeline.region,
            allSubnets,
            isolatedSubnetsAZ,
            privateSubnet,
            vpcEndpoints,
            vpcEndpointSecurityGroupRules,
            [
              'emr-serverless',
              'glue',
            ]);
        }
        if (pipeline.dataModeling) {
          validateVpcEndpoint(pipeline.region,
            allSubnets,
            isolatedSubnetsAZ,
            privateSubnet,
            vpcEndpoints,
            vpcEndpointSecurityGroupRules,
            [
              'redshift-data',
              'states',
              'sts',
              'dynamodb',
            ]);
        }
      }
    }
  }

  if (pipeline.dataModeling?.redshift) {
    let redshiftType = '';
    let vpcSubnets = allSubnets;
    let redshiftSubnets: ClickStreamSubnet[] = [];
    let redshiftSecurityGroups: string[] = [];
    let redshiftSecurityGroupsRules: SecurityGroupRule[] = [];
    let portOfRedshift = 5439;

    if (pipeline.dataModeling?.redshift?.newServerless) {
      redshiftType = REDSHIFT_MODE.NEW_SERVERLESS;
      if (pipeline.dataModeling?.redshift?.newServerless?.network.vpcId !== pipeline.network.vpcId) {
        vpcSubnets = await describeSubnetsWithType(
          pipeline.region, pipeline.dataModeling.redshift.newServerless.network.vpcId, SubnetType.ALL);
      }
      redshiftSubnets = vpcSubnets.filter(
        subnet => pipeline.dataModeling?.redshift?.newServerless?.network.subnetIds.includes(subnet.id));
      redshiftSecurityGroups = pipeline.dataModeling?.redshift?.newServerless?.network.securityGroups;
      redshiftSecurityGroupsRules = await describeSecurityGroupsWithRules(pipeline.region, redshiftSecurityGroups);
    } else if (pipeline.dataModeling?.redshift?.provisioned) {
      redshiftType = REDSHIFT_MODE.PROVISIONED;
      if (resources?.redshift?.network.vpcId !== pipeline.network.vpcId) {
        vpcSubnets = await describeSubnetsWithType(
          pipeline.region, resources?.redshift?.network.vpcId!, SubnetType.ALL);
      }
      redshiftSubnets = vpcSubnets.filter(
        subnet => resources?.redshift?.network.subnetIds?.includes(subnet.id));
      redshiftSecurityGroups = resources?.redshift?.network.securityGroups!;
      redshiftSecurityGroupsRules = await describeSecurityGroupsWithRules(pipeline.region, redshiftSecurityGroups);
      portOfRedshift = resources.redshift?.endpoint.port ?? 5439;
    }

    const azSet = new Set<string>();
    const quickSightSubnets: ClickStreamSubnet[] = [];
    for (let subnet of redshiftSubnets) {
      if (!azSet.has(subnet.availabilityZone)) {
        quickSightSubnets.push(subnet);
      }
      azSet.add(subnet.availabilityZone);
    }
    resources.quickSightSubnetIds = quickSightSubnets.map(subnet => subnet.id);

    if (redshiftType === REDSHIFT_MODE.NEW_SERVERLESS) {
      const azInRegion = await listAvailabilityZones(pipeline.region);
      if (azInRegion.length < 2) {
        throw new ClickStreamBadRequestError(
          `Validation error: error in obtaining ${pipeline.region} availability zones information. ` +
          'Please check and try again.',
        );
      } else if (azInRegion.length === 2) {
        if (azSet.size < 2 || redshiftSubnets.length < 3) {
          throw new ClickStreamBadRequestError(
            `Validation error: the network for deploying ${redshiftType} Redshift at least three subnets that cross two AZs. ` +
            'Please check and try again.',
          );
        }
      } else if (azSet.size < 3) {
        throw new ClickStreamBadRequestError(
          `Validation error: the network for deploying ${redshiftType} Redshift at least three subnets that cross three AZs. ` +
          'Please check and try again.',
        );
      }
    }

    if (pipeline.reporting) {
      const accountInfo = await describeAccountSubscription();
      if (!accountInfo.AccountInfo?.Edition?.includes('ENTERPRISE')) {
        throw new ClickStreamBadRequestError(
          'Validation error: QuickSight edition is not enterprise in your account.',
        );
      }
      const validSubnets = [];
      for (let quickSightSubnet of quickSightSubnets) {
        const redshiftCidrRule: SecurityGroupRule = {
          IsEgress: false,
          IpProtocol: 'tcp',
          FromPort: portOfRedshift,
          ToPort: portOfRedshift,
          CidrIpv4: quickSightSubnet.cidr,
        };
        if (containRule(redshiftSecurityGroups, redshiftSecurityGroupsRules, redshiftCidrRule)) {
          validSubnets.push(quickSightSubnet.id);
          break;
        }
      }
      if (isEmpty(validSubnets)) {
        throw new ClickStreamBadRequestError(
          `Validation error: ${redshiftType} Redshift security groups missing rule for QuickSight access.`,
        );
      }
    }
  }

  if (pipeline.ingestionServer.loadBalancer.enableApplicationLoadBalancerAccessLog) {
    const enableAccessLogs = await validateEnableAccessLogsForALB(pipeline.region, pipeline.bucket.name);
    if (!enableAccessLogs) {
      throw new ClickStreamBadRequestError(
        'Validation error: your S3 bucket must have a bucket policy that grants Elastic Load Balancing permission to write the access logs to the bucket.',
      );
    }
  }

  return true;
};

export const validateSinkBatch = (sinkType: PipelineSinkType, sinkBatch: IngestionServerSinkBatchProps) => {
  if (sinkType === PipelineSinkType.KAFKA) {
    if (sinkBatch.intervalSeconds < 0 || sinkBatch.intervalSeconds > 3000) {
      throw new ClickStreamBadRequestError(
        'Validation error: the sink batch interval must 0 <= interval <= 3000 for Kafka sink. ' +
        'Please check and try again.',
      );
    }
    if (sinkBatch.size < 1 || sinkBatch.size > 50000) {
      throw new ClickStreamBadRequestError(
        'Validation error: the sink batch size must 1 <= size <=50000 for Kafka sink. ' +
        'Please check and try again.',
      );
    }
  }
  if (sinkType === PipelineSinkType.KINESIS) {
    if (sinkBatch.intervalSeconds < 0 || sinkBatch.intervalSeconds > 300) {
      throw new ClickStreamBadRequestError(
        'Validation error: the sink batch interval must 0 <= interval <= 300 for Kinesis sink. ' +
        'Please check and try again.',
      );
    }
    if (sinkBatch.size < 1 || sinkBatch.size > 10000) {
      throw new ClickStreamBadRequestError(
        'Validation error: the sink batch size must 1 <= size <= 10000 for Kinesis sink. ' +
        'Please check and try again.',
      );
    }
  }
  return true;
};

export const validateIngestionServerNum = (serverSize: IngestionServerSizeProps) => {
  if (serverSize.serverMin === 1 && serverSize.serverMax === 1) {
    throw new ClickStreamBadRequestError(
      'Validation error: this pipeline not allow to upgrade with the server size minimum and maximum are 1.',
    );
  }
  return true;
};

const validateVpcEndpoint = (region: string,
  allSubnets: ClickStreamSubnet[],
  isolatedSubnetsAZ: string[],
  subnet: ClickStreamSubnet,
  vpcEndpoints: VpcEndpoint[],
  securityGroupsRules: SecurityGroupRule[],
  services: string[]) => {
  let prefix = `com.amazonaws.${region}`;
  if (region.startsWith('cn')) {
    prefix = 'cn.com.amazonaws.cn-northwest-1';
  }
  services = services.map(s => `${prefix}.${s}`);
  const invalidServices = checkVpcEndpoint(
    allSubnets,
    isolatedSubnetsAZ,
    subnet.routeTable!,
    vpcEndpoints,
    securityGroupsRules,
    subnet,
    services);
  if (!isEmpty(invalidServices)) {
    throw new ClickStreamBadRequestError(
      `Validation error: vpc endpoint error in subnet: ${subnet.id}, detail: ${JSON.stringify(invalidServices)}.`,
    );
  }
};
export const validateDataProcessingInterval = (scheduleExpression: string) => {
  if (scheduleExpression.startsWith('rate')) {
    const indexSpace = scheduleExpression.indexOf(' ');
    const fixedValue = parseInt(scheduleExpression.substring(5, indexSpace));
    const fixedUnitStr = scheduleExpression.substring(indexSpace + 1, scheduleExpression.length - 1);
    if (fixedUnitStr.startsWith('minute') && fixedValue < 6) {
      throw new ClickStreamBadRequestError(
        'Validation error: the minimum interval of data processing is 6 minutes.',
      );
    }
    return true;
  } else if (scheduleExpression.startsWith('cron')) {
    const cronValue = scheduleExpression.substring(5, scheduleExpression.length - 1);
    const nowDate = new Date();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    var options = {
      currentDate: nowDate,
      iterator: true,
    };
    try {
      const interval = parseExpression(cronValue, options);
      const runTimes = [];
      let num = 0;
      while (num < 10) {
        const obj = interval.next() as IteratorResult<CronDate>;
        runTimes.push(obj.value.getTime());
        num += 1;
      }
      if (runTimes.length === 0) {
        throw new ClickStreamBadRequestError(
          'Validation error: schedule expression is not a reasonable interval.',
        );
      } else {
        let firstTime = runTimes[0];
        for (let i = 1; i < runTimes.length; i++) {
          if (runTimes[i] - firstTime < 360000) {
            throw new ClickStreamBadRequestError(
              'Validation error: the minimum interval of data processing is 6 minutes.',
            );
          }
          firstTime = runTimes[i];
        }
      }
      return true;
    } catch (err) {
      logger.warn('schedule expression parse error: ', { err });
      throw new ClickStreamBadRequestError(
        `Validation error: schedule expression(${scheduleExpression}) parse error.`,
      );
    }
  }
  throw new ClickStreamBadRequestError(
    'Validation error: schedule expression format error.',
  );
};

export const validateEnableAccessLogsForALB = async (region: string, bucket: string) => {
  const policyStr = await getS3BucketPolicy(region, bucket);
  if (!policyStr) {
    return false;
  }
  const partition = region.startsWith('cn') ? 'aws-cn' : 'aws';
  const policy = JSON.parse(policyStr) as Policy;
  const accountId = getALBLogServiceAccount(region);
  if (accountId) {
    return checkPolicy(
      policy,
      {
        key: 'AWS',
        value: `arn:${partition}:iam::${accountId}:root`,
      },
      `arn:${partition}:s3:::${bucket}/clickstream/*`);
  } else {
    return checkPolicy(
      policy,
      {
        key: 'Service',
        value: 'logdelivery.elasticloadbalancing.amazonaws.com',
      },
      `arn:${partition}:s3:::${bucket}/clickstream/*`);
  }
  return false;
};

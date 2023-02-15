/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { CfnParameter, CfnRule, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DOMAIN_NAME_PATTERN, SUBNETS_PATTERN } from '../common/constant';
import { createKafkaBrokersParameter, createKafkaTopicParameter, createMskClusterNameParameter, createMskSecurityGroupIdParameter } from '../common/parameter';

const subnetsPattern = SUBNETS_PATTERN;
const domainNamePattern = DOMAIN_NAME_PATTERN;

export function createStackParameters(scope: Construct) {
  // CfnParameter

  const vpcIdParam = new CfnParameter(scope, 'VpcId', {
    description: 'Vpc id',
    type: 'AWS::EC2::VPC::Id',
  });

  const publicSubnetIdsParam = new CfnParameter(scope, 'PublicSubnetIds', {
    description: 'Public subnet ids',
    // CommaDelimitedList and List<AWS::EC2::Subnet::Id> not work here
    type: 'String',
    allowedPattern: `^${subnetsPattern}$`,
    constraintDescription: `PublicSubnetIds must have at least 2 subnets and match pattern ${subnetsPattern}`,
  });

  const privateSubnetIdsParam = new CfnParameter(scope, 'PrivateSubnetIds', {
    description: 'Private subnet ids',
    // CommaDelimitedList and List<AWS::EC2::Subnet::Id> not work here
    type: 'String',
    allowedPattern: `^${subnetsPattern}$`,
    constraintDescription: `PrivateSubnetIds must have at least 2 subnets and match pattern ${subnetsPattern}`,
  });

  const hostedZoneIdParam = new CfnParameter(scope, 'HostedZoneId', {
    description: 'Hosted zone id',
    type: 'AWS::Route53::HostedZone::Id',
  });

  const zoneNameParam = new CfnParameter(scope, 'ZoneName', {
    description: 'Hosted zone name',
    type: 'String',
    allowedPattern: `^${domainNamePattern}$`,
    constraintDescription: `ZoneName must match pattern ${domainNamePattern}`,
  });

  const serverEndpointPathParam = new CfnParameter(
    scope,
    'ServerEndpointPath',
    {
      description: 'Server endpoint path',
      type: 'String',
      default: '/collect',
      allowedPattern: '^/[a-zA-Z0-9$#&@%\\-\\_\\/]+$',
      constraintDescription:
        'ServerEndpointPath must match pattern /[a-zA-Z0-9$#&@%\\-\\_\\/]+',
    },
  );

  const serverCorsOriginParam = new CfnParameter(scope, 'ServerCorsOrigin', {
    description: 'Server CORS origin',
    type: 'String',
    default: '*',
    allowedPattern: `^\\*$|^(${domainNamePattern}(,\\s*${domainNamePattern})*)$`,
    constraintDescription: `ServerCorsOrigin must match pattern \\*|(${domainNamePattern}(,\\s*${domainNamePattern})*)`,
  });

  const protocolParam = new CfnParameter(scope, 'Protocol', {
    description: 'Server protocol',
    type: 'String',
    allowedValues: ['HTTP', 'HTTPS'],
    default: 'HTTP',
  });

  const enableApplicationLoadBalancerAccessLogParam = new CfnParameter(
    scope,
    'EnableApplicationLoadBalancerAccessLog',
    {
      description: 'Enable application load balancer access log',
      type: 'String',
      allowedValues: ['Yes', 'No'],
      default: 'No',
    },
  );

  const logS3BucketParam = new CfnParameter(scope, 'LogS3Bucket', {
    description: 'S3 bucket to save log (optional)',
    type: 'String',
    default: '',
  });

  const logS3PrefixParam = new CfnParameter(scope, 'LogS3Prefix', {
    description: 'S3 object prefix to save log (optional)',
    type: 'String',
    allowedPattern: '[^/]+',
    constraintDescription: 'LogS3Prefix must match pattern [^/]+',
    default: 'ingestion-server-log',
  });

  const notificationsTopicArnParam = new CfnParameter(
    scope,
    'NotificationsTopicArn',
    {
      description: 'AutoScaling group notifications SNS topic arn (optional)',
      type: 'String',
      default: '',
      allowedPattern: '(arn:(aws|aws-cn):sns:.*?:[0-9]+:.*)?',
      constraintDescription:
        'NotificationsTopicArn must match pattern (arn:(aws|aws-cn):sns:.*?:[0-9]+:.*)?',
    },
  );

  const sinkToKafkaParam = new CfnParameter(scope, 'SinkToKafka', {
    description: 'Sink to kafka',
    type: 'String',
    allowedValues: ['Yes', 'No'],
    default: 'Yes',
  });

  const kafkaBrokersParam = createKafkaBrokersParameter(scope, 'KafkaBrokers', true, { default: '' });
  const kafkaTopicParam = createKafkaTopicParameter(scope, 'KafkaTopic', true, { default: '' });
  const mskClusterNameParam = createMskClusterNameParameter(scope, 'MskClusterName', { default: '' });
  const mskSecurityGroupIdParam = createMskSecurityGroupIdParameter(scope, 'MskSecurityGroupId', true, { default: '' });

  const domainPrefixParam = new CfnParameter(scope, 'DomainPrefix', {
    description: 'Domain prefix',
    type: 'String',
    allowedPattern: '([a-zA-Z0-9_\\-]{1,63})',
    constraintDescription:
      'DomainPrefix must match pattern ([a-zA-Z0-9_\\-]{1,63})?',
  });

  const serverMinParam = new CfnParameter(scope, 'ServerMin', {
    description: 'Server size min number',
    type: 'Number',
    default: '2',
    minValue: 0,
  });

  const serverMaxParam = new CfnParameter(scope, 'ServerMax', {
    description: 'Server size max number',
    type: 'Number',
    default: '2',
    minValue: 0,
  });

  const warmPoolSizeParam = new CfnParameter(scope, 'WarmPoolSize', {
    description: 'Server autoscaling warm pool min size',
    type: 'Number',
    default: '0',
    minValue: 0,
  });

  const scaleOnCpuUtilizationPercentParam = new CfnParameter(
    scope,
    'ScaleOnCpuUtilizationPercent',
    {
      description: 'Autoscaling on CPU utilization percent',
      type: 'Number',
      default: '50',
      maxValue: 100,
      minValue: 0,
    },
  );

  // CfnRule

  new CfnRule(scope, 'sinkToKafkaAndKafkaBrokersAndKafkaTopic', {
    assertions: [
      {
        assert: Fn.conditionOr(
          Fn.conditionAnd(
            Fn.conditionEquals(sinkToKafkaParam.valueAsString, 'Yes'),
            Fn.conditionNot(
              Fn.conditionEquals(kafkaTopicParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(kafkaBrokersParam.valueAsString, ''),
            ),
          ),

          Fn.conditionEquals(sinkToKafkaParam.valueAsString, 'No'),
        ),
        assertDescription:
          'kafkaTopic and kafkaBrokers cannot be empty when sinkToKafka=true',
      },
    ],
  });

  new CfnRule(scope, 'logS3BucketAndEnableLogRule', {
    assertions: [
      {
        assert: Fn.conditionOr(
          Fn.conditionAnd(
            Fn.conditionEquals(
              enableApplicationLoadBalancerAccessLogParam.valueAsString,
              'Yes',
            ),
            Fn.conditionNot(
              Fn.conditionEquals(logS3BucketParam.valueAsString, ''),
            ),
          ),
          Fn.conditionEquals(
            enableApplicationLoadBalancerAccessLogParam.valueAsString,
            'No',
          ),
        ),
        assertDescription:
          'logS3Bucket cannot be empty when enableApplicationLoadBalancerAccessLog=Yes',
      },
    ],
  });

  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: [
        {
          Label: { default: 'VpcId and Subnets' },
          Parameters: [
            vpcIdParam.logicalId,
            publicSubnetIdsParam.logicalId,
            privateSubnetIdsParam.logicalId,
          ],
        },

        {
          Label: { default: 'Domain' },
          Parameters: [
            hostedZoneIdParam.logicalId,
            zoneNameParam.logicalId,
            domainPrefixParam.logicalId,
          ],
        },

        {
          Label: { default: 'Server' },
          Parameters: [
            protocolParam.logicalId,
            serverEndpointPathParam.logicalId,
            serverCorsOriginParam.logicalId,
            serverMaxParam.logicalId,
            serverMinParam.logicalId,
            scaleOnCpuUtilizationPercentParam.logicalId,
            warmPoolSizeParam.logicalId,
            notificationsTopicArnParam.logicalId,
          ],
        },

        {
          Label: { default: 'Kafka Cluster' },
          Parameters: [
            sinkToKafkaParam.logicalId,
            kafkaBrokersParam.logicalId,
            kafkaTopicParam.logicalId,
            mskClusterNameParam.logicalId,
            mskSecurityGroupIdParam.logicalId,
          ],
        },

        {
          Label: { default: 'Logs' },
          Parameters: [
            enableApplicationLoadBalancerAccessLogParam.logicalId,
            logS3BucketParam.logicalId,
            logS3PrefixParam.logicalId,

          ],
        },
      ],

      ParameterLabels: {
        [vpcIdParam.logicalId]: {
          default: 'Vpc id',
        },

        [publicSubnetIdsParam.logicalId]: {
          default: 'Public subnet ids',
        },

        [privateSubnetIdsParam.logicalId]: {
          default: 'Private subnet ids',
        },

        [hostedZoneIdParam.logicalId]: {
          default: 'Hosted zone id',
        },

        [zoneNameParam.logicalId]: {
          default: 'Hosted zone name',
        },

        [serverEndpointPathParam.logicalId]: {
          default: 'Server endpoint path',
        },

        [serverCorsOriginParam.logicalId]: {
          default: 'Server CORS origin',
        },

        [protocolParam.logicalId]: {
          default: 'Protocol',
        },

        [enableApplicationLoadBalancerAccessLogParam.logicalId]: {
          default: 'Enable application load balancer access log',
        },

        [logS3BucketParam.logicalId]: {
          default: 'S3 bucket to save log',
        },

        [logS3PrefixParam.logicalId]: {
          default: 'S3 object prefix to save log',
        },

        [notificationsTopicArnParam.logicalId]: {
          default: 'AutoScaling group notifications SNS topic arn',
        },

        [sinkToKafkaParam.logicalId]: {
          default: 'Sink to kafka',
        },

        [kafkaBrokersParam.logicalId]: {
          default: 'Kafka brokers string',
        },

        [kafkaTopicParam.logicalId]: {
          default: 'Kafka topic',
        },

        [mskSecurityGroupIdParam.logicalId]: {
          default: 'Amazon managed streaming for apache kafka (Amazon MSK) security group id',
        },

        [mskClusterNameParam.logicalId]: {
          default: 'Amazon managed streaming for apache kafka (Amazon MSK) cluster name',
        },

        [domainPrefixParam.logicalId]: {
          default: 'Domain prefix',
        },

        [serverMinParam.logicalId]: {
          default: 'Server size min number',
        },

        [serverMaxParam.logicalId]: {
          default: 'Server size max number',
        },

        [warmPoolSizeParam.logicalId]: {
          default: 'Server autoscaling warm pool min size',
        },

        [scaleOnCpuUtilizationPercentParam.logicalId]: {
          default: 'Autoscaling on CPU utilization percent',
        },
      },
    },
  };

  return {
    metadata,
    params: {
      vpcIdParam,
      publicSubnetIdsParam,
      privateSubnetIdsParam,
      hostedZoneIdParam,
      zoneNameParam,
      serverEndpointPathParam,
      serverCorsOriginParam,
      protocolParam,
      enableApplicationLoadBalancerAccessLogParam,
      logS3BucketParam,
      logS3PrefixParam,
      notificationsTopicArnParam,
      sinkToKafkaParam,
      kafkaBrokersParam,
      kafkaTopicParam,
      mskSecurityGroupIdParam,
      mskClusterNameParam,
      domainPrefixParam,
      serverMinParam,
      serverMaxParam,
      warmPoolSizeParam,
      scaleOnCpuUtilizationPercentParam,
    },
  };
}

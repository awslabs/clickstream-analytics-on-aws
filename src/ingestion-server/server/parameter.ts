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

import { CfnParameter, CfnRule, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  DOMAIN_NAME_PATTERN,
  PARAMETER_GROUP_LABEL_VPC,
  PARAMETER_GROUP_LABEL_DOMAIN,
  PARAMETER_LABEL_PRIVATE_SUBNETS,
  PARAMETER_LABEL_PUBLIC_SUBNETS,
  PARAMETER_LABEL_VPCID,
  PARAMETER_LABEL_CERTIFICATE_ARN,
  PARAMETER_LABEL_DOMAIN_NAME,
} from '../../common/constant';

import { Parameters, SubnetParameterType } from '../../common/parameters';
import { CORS_PATTERN } from '../../control-plane/backend/lambda/api/common/constants-ln';

export function createStackParameters(scope: Construct, props: {deliverToKinesis: boolean; deliverToKafka: boolean; deliverToS3: boolean}) {
  // CfnParameter
  const netWorkProps = Parameters.createNetworkParameters(scope, true, SubnetParameterType.String);

  const domainNameParam = new CfnParameter(
    scope,
    'DomainName',
    {
      description: 'The custom domain name.',
      type: 'String',
      default: '',
      allowedPattern: `^$|^${DOMAIN_NAME_PATTERN}$`,
      constraintDescription: `Domain name must match pattern ${DOMAIN_NAME_PATTERN}`,
    },
  );

  const certificateArnParam = new CfnParameter(
    scope,
    'ACMCertificateArn',
    {
      description: 'The ACM Certificate arn',
      type: 'String',
      default: '',
      allowedPattern: '^$|^arn:aws(-cn|-us-gov)?:acm:[a-z0-9-]+:[0-9]{12}:certificate\/[a-zA-Z0-9-]+$',
    },
  );

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
    default: '',
    allowedPattern: CORS_PATTERN,
    constraintDescription: `ServerCorsOrigin must match pattern ${CORS_PATTERN}`,
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

  const devModeParam = new CfnParameter(
    scope,
    'DevMode',
    {
      description: 'Enable dev mode',
      type: 'String',
      allowedValues: ['Yes', 'No'],
      default: 'No',
    },
  );

  const { projectIdParam, appIdsParam } = Parameters.createProjectAndAppsParameters(scope, 'ProjectId', 'AppIds');

  const logS3BucketParam = Parameters.createS3BucketParameter(scope, 'LogS3Bucket', {
    description: 'S3 bucket name to save log (optional)',
    default: '',
  });

  const logS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'LogS3Prefix', {
    description: 'S3 object prefix to save log (optional)',
    default: 'ingestion-server-log/',
  });

  const clickStreamSDKParam = new CfnParameter(
    scope,
    'ClickStreamSDK',
    {
      description: 'Indicate solution use click stream sdk or third party SDK',
      type: 'String',
      allowedValues: ['Yes', 'No'],
      default: 'Yes',
    },
  );

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

  const enableGlobalAcceleratorParam = new CfnParameter(
    scope,
    'EnableGlobalAccelerator',
    {
      description: 'Enable global accelerator',
      type: 'String',
      allowedValues: ['Yes', 'No'],
      default: 'No',
    },
  );

  const enableAuthenticationParam = new CfnParameter(
    scope,
    'EnableAuthentication',
    {
      description: 'Enable authentication feature for ingestion server',
      type: 'String',
      allowedValues: ['Yes', 'No'],
      default: 'No',
    },
  );

  const authenticationSecretArnParam = new CfnParameter(
    scope,
    'AuthenticationSecretArn',
    {
      description: 'The AuthenticationSecretArn of OIDC provider',
      type: 'String',
      default: '',
      allowedPattern: '^$|^arn:aws(-cn|-us-gov)?:secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9-]+$',
      constraintDescription:
      'AuthenticationSecretArn must match pattern ^$|^arn:aws(-cn|-us-gov)?:secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9-]+$',
    },
  );

  const workerStopTimeoutParam = new CfnParameter(scope, 'WorkerStopTimeout', {
    description: 'Worker container stop timeout seconds',
    type: 'Number',
    default: '330',
    minValue: 60,
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

            Fn.conditionNot(
              Fn.conditionEquals(logS3PrefixParam.valueAsString, ''),
            ),
          ),
          Fn.conditionEquals(
            enableApplicationLoadBalancerAccessLogParam.valueAsString,
            'No',
          ),
        ),
        assertDescription:
          'logS3Bucket and logS3Prefix cannot be empty when enableApplicationLoadBalancerAccessLog=Yes',
      },
    ],
  });

  new CfnRule(scope, 'enableAuthenticationRule', {
    assertions: [
      {
        assert: Fn.conditionOr(
          Fn.conditionAnd(
            Fn.conditionEquals(
              enableAuthenticationParam.valueAsString,
              'Yes',
            ),
            Fn.conditionNot(
              Fn.conditionEquals(authenticationSecretArnParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(protocolParam.valueAsString, 'HTTP'),
            ),
          ),
          Fn.conditionEquals(
            enableAuthenticationParam.valueAsString,
            'No',
          ),
        ),
        assertDescription:
          'AuthenticationSecretArn cannot be empty or Protocol cannot be HTTP when EnableAuthentication=Yes',
      },
    ],
  });

  let kafkaKinesisS3ParamsGroup = [];
  let kafkaKinesisS3ParamsLabels= {};

  // Kafka

  let kafkaParams;
  if (props.deliverToKafka) {
    const kafkaBrokersParam = Parameters.createKafkaBrokersParameter(scope, 'KafkaBrokers', true, { default: '' });
    const kafkaTopicParam = Parameters.createKafkaTopicParameter(scope, 'KafkaTopic', true, { default: '' });
    const mskClusterNameParam = Parameters.createMskClusterNameParameter(scope, 'MskClusterName', { default: '' });
    const mskSecurityGroupIdParam = Parameters.createMskSecurityGroupIdParameter(scope, 'MskSecurityGroupId', true, { default: '' });

    kafkaParams = {
      kafkaBrokersParam,
      kafkaTopicParam,
      mskSecurityGroupIdParam,
      mskClusterNameParam,
    },

    kafkaKinesisS3ParamsGroup.push({
      Label: { default: 'Kafka Cluster' },
      Parameters: [
        kafkaBrokersParam.logicalId,
        kafkaTopicParam.logicalId,
        mskClusterNameParam.logicalId,
        mskSecurityGroupIdParam.logicalId,
      ],
    }),

    kafkaKinesisS3ParamsLabels = {
      ... kafkaKinesisS3ParamsLabels,
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
    };

    new CfnRule(scope, 'sinkToKafkaAndKafkaBrokersAndKafkaTopic', {
      assertions: [
        {
          assert: Fn.conditionAnd(
            Fn.conditionNot(
              Fn.conditionEquals(kafkaTopicParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(kafkaBrokersParam.valueAsString, ''),
            ),
          ),
          assertDescription:
          'kafkaTopic and kafkaBrokers cannot be empty',
        },
      ],
    });

  }

  // S3
  let s3Params;
  if (props.deliverToS3) {

    const s3DataBucketParam = Parameters.createS3BucketParameter(scope, 'S3DataBucket', {
      description: 'S3 data bucket name',
      default: '',
    });

    const s3DataPrefixParam = Parameters.createS3PrefixParameter(scope, 'S3DataPrefix', {
      description: 'S3 data object prefix',
      default: 's3-data/',
    });


    const s3BatchMaxBytesParam = new CfnParameter(scope, 'S3BatchMaxBytes', {
      description: 'Batch max bytes',
      type: 'Number',
      default: '30000000',
      maxValue: 50000000,
      minValue: 1000000,
    });

    const s3BatchTimeoutParam = new CfnParameter(scope, 'S3BatchTimeout', {
      description: 'Batch timeout seconds',
      type: 'Number',
      default: '300',
      minValue: 30,
    });
    s3Params = {
      s3DataBucketParam,
      s3DataPrefixParam,
      s3BatchMaxBytesParam,
      s3BatchTimeoutParam,
    },
    kafkaKinesisS3ParamsGroup.push( {
      Label: { default: 'S3 Bucket' },
      Parameters: [
        s3DataBucketParam.logicalId,
        s3DataPrefixParam.logicalId,
        s3BatchMaxBytesParam.logicalId,
        s3BatchTimeoutParam.logicalId,
      ],
    }),

    kafkaKinesisS3ParamsLabels = {
      ... kafkaKinesisS3ParamsLabels,
      [s3DataBucketParam.logicalId]: {
        default: 'S3 bucket name',
      },

      [s3DataPrefixParam.logicalId]: {
        default: 'S3 object prefix',
      },

      [s3BatchMaxBytesParam.logicalId]: {
        default: 'Batch max bytes',
      },

      [s3BatchTimeoutParam.logicalId]: {
        default: 'Batch timeout seconds',
      },

    },

    new CfnRule(scope, 'sinkToS3Rule', {
      assertions: [
        {
          assert:
            Fn.conditionAnd(
              Fn.conditionNot(
                Fn.conditionEquals(s3DataBucketParam.valueAsString, ''),
              ),
              Fn.conditionNot(
                Fn.conditionEquals(s3DataPrefixParam.valueAsString, ''),
              ),
            ),
          assertDescription:
            's3DataBucket and s3DataPrefix cannot be empty when sinkToS3Param=Yes',
        },
      ],
    });
  }

  // Kinesis
  let kinesisParams;
  if (props.deliverToKinesis) {

    const kinesisDataS3BucketParam = Parameters.createS3BucketParameter(scope, 'KinesisDataS3Bucket', {
      description: 'S3 bucket name to save data from Kinesis Data Stream',
      default: '',
    });

    const kinesisDataS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'KinesisDataS3Prefix', {
      description: 'S3 object prefix to save data from Kinesis Data Stream',
      default: 'kinesis-data/',
    });

    const kinesisStreamModeParam = new CfnParameter(scope, 'KinesisStreamMode', {
      description: 'Kinesis Data Stream mode',
      type: 'String',
      allowedValues: ['ON_DEMAND', 'PROVISIONED'],
      default: 'ON_DEMAND',
    });

    const kinesisShardCountParam = new CfnParameter(scope, 'KinesisShardCount', {
      description:
      'Number of Kinesis Data Stream shards, only apply for Provisioned mode',
      type: 'Number',
      default: '3',
      minValue: 1,
    });

    const kinesisDataRetentionHoursParam = new CfnParameter(
      scope,
      'KinesisDataRetentionHours',
      {
        description: 'Data retention hours in Kinesis Data Stream, from 24 hours by default, up to 8760 hours (365 days)',
        type: 'Number',
        default: '24',
        minValue: 24,
        maxValue: 8760,
      },
    );

    const kinesisBatchSizeParam = new CfnParameter(
      scope,
      'KinesisBatchSize',
      {
        description: 'Batch size for Lambda function to read data from Kinesis Data Stream',
        type: 'Number',
        default: '10000',
        minValue: 1,
        maxValue: 10000,
      },
    );

    const kinesisMaxBatchingWindowSecondsParam = new CfnParameter(
      scope,
      'KinesisMaxBatchingWindowSeconds',
      {
        description: 'Max batching window in seconds for Lambda function to read data from Kinesis Data Stream',
        type: 'Number',
        default: '300',
        minValue: 0,
        maxValue: 300,
      },
    );
    kinesisParams = {
      kinesisDataS3BucketParam,
      kinesisDataS3PrefixParam,
      kinesisStreamModeParam,
      kinesisShardCountParam,
      kinesisDataRetentionHoursParam,
      kinesisBatchSizeParam,
      kinesisMaxBatchingWindowSecondsParam,
    },

    kafkaKinesisS3ParamsGroup.push({
      Label: { default: 'Kinesis Data Stream' },
      Parameters: [
        kinesisDataS3BucketParam.logicalId,,
        kinesisDataS3PrefixParam.logicalId,,
        kinesisStreamModeParam.logicalId,,
        kinesisShardCountParam.logicalId,,
        kinesisDataRetentionHoursParam.logicalId,,
        kinesisBatchSizeParam.logicalId,,
        kinesisMaxBatchingWindowSecondsParam.logicalId,
      ],
    }),

    kafkaKinesisS3ParamsLabels = {
      ... kafkaKinesisS3ParamsLabels,
      [ kinesisDataS3BucketParam.logicalId]: {
        default: 'Data S3 bucket',
      },

      [ kinesisDataS3PrefixParam.logicalId]: {
        default: 'Data S3 object prefix',
      },

      [ kinesisStreamModeParam.logicalId]: {
        default: 'Stream mode',
      },

      [ kinesisShardCountParam.logicalId]: {
        default: 'Shards number',
      },

      [ kinesisDataRetentionHoursParam.logicalId]: {
        default: 'Data retention hours',
      },

      [ kinesisBatchSizeParam.logicalId]: {
        default: 'Batch size for Lambda function',
      },

      [ kinesisMaxBatchingWindowSecondsParam.logicalId]: {
        default: 'Max batching window for Lambda function',
      },
    };

    new CfnRule(scope, 'sinkToKinesisRule', {
      assertions: [
        {
          assert:
          Fn.conditionAnd(
            Fn.conditionNot(
              Fn.conditionEquals(kinesisDataS3BucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(kinesisDataS3PrefixParam.valueAsString, ''),
            ),
          ),
          assertDescription:
          'kinesisDataS3Bucket and kinesisDataS3Prefix cannot be empty when sinkToKinesis=Yes',
        },
      ],
    });
  }


  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: [
        {
          Label: { default: 'Project' },
          Parameters: [
            projectIdParam.logicalId,
          ],
        },

        {
          Label: { default: PARAMETER_GROUP_LABEL_VPC },
          Parameters: [
            netWorkProps.vpcId.logicalId,
            netWorkProps.publicSubnets!.logicalId,
            netWorkProps.privateSubnets.logicalId,
          ],
        },

        {
          Label: { default: PARAMETER_GROUP_LABEL_DOMAIN },
          Parameters: [
            domainNameParam.logicalId,
            certificateArnParam.logicalId,
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
        ... kafkaKinesisS3ParamsGroup,
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

        [projectIdParam.logicalId]: {
          default: 'Project Id',
        },

        [netWorkProps.vpcId.logicalId]: {
          default: PARAMETER_LABEL_VPCID,
        },

        [netWorkProps.publicSubnets!.logicalId]: {
          default: PARAMETER_LABEL_PUBLIC_SUBNETS,
        },

        [netWorkProps.privateSubnets.logicalId]: {
          default: PARAMETER_LABEL_PRIVATE_SUBNETS,
        },

        [domainNameParam.logicalId]: {
          default: PARAMETER_LABEL_DOMAIN_NAME,
        },

        [certificateArnParam.logicalId]: {
          default: PARAMETER_LABEL_CERTIFICATE_ARN,
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
          default: 'S3 bucket name to save log',
        },

        [logS3PrefixParam.logicalId]: {
          default: 'S3 object prefix to save log',
        },

        [notificationsTopicArnParam.logicalId]: {
          default: 'AutoScaling group notifications SNS topic arn',
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
        ... kafkaKinesisS3ParamsLabels,

      },
    },
  };

  return {
    metadata,
    params: {
      vpcIdParam: netWorkProps.vpcId,
      publicSubnetIdsParam: netWorkProps.publicSubnets,
      privateSubnetIdsParam: netWorkProps.privateSubnets,
      domainNameParam,
      certificateArnParam,
      serverEndpointPathParam,
      serverCorsOriginParam,
      protocolParam,
      enableApplicationLoadBalancerAccessLogParam,
      logS3BucketParam,
      logS3PrefixParam,
      notificationsTopicArnParam,
      serverMinParam,
      serverMaxParam,
      warmPoolSizeParam,
      scaleOnCpuUtilizationPercentParam,
      kafkaParams,
      s3Params,
      kinesisParams,
      enableGlobalAcceleratorParam,
      devModeParam,
      projectIdParam,
      appIdsParam,
      clickStreamSDKParam,
      workerStopTimeoutParam,
      enableAuthenticationParam,
      authenticationSecretArnParam,
    },
  };
}

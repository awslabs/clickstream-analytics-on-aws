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


import { CfnParameter, Fn, Stack, StackProps } from 'aws-cdk-lib';
import { ISecurityGroup, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { addCfnNagForLogRetention, addCfnNagToStack, addCfnNagForCustomResourceProvider } from './common/cfn-nag';
import { DOMAIN_NAME_PATTERN } from './common/constant';
import { Parameters } from './common/parameters';
import { SolutionInfo } from './common/solution-info';
import {
  KafkaS3SinkConnector,
  KafkaS3SinkConnectorProps,
} from './ingestion-server/kafka-s3-connector/kafka-s3-connector';
const domainNamePattern = DOMAIN_NAME_PATTERN;

export interface KafkaS3SinkConnectorStackProps extends StackProps {}

export class KafkaS3SinkConnectorStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: KafkaS3SinkConnectorStackProps = {},
  ) {
    super(scope, id, props);

    const featureName = 'KafkaS3SinkConnector';

    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-kco) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const projectIdParam = Parameters.createProjectIdParameter(this);

    const dataS3BucketParam = new CfnParameter(this, 'DataS3Bucket', {
      description: 'S3 bucket to save data',
      type: 'String',
    });

    const dataS3PrefixParam = Parameters.createS3PrefixParameter(this, 'DataS3Prefix', {
      description: 'S3 data object prefix',
      default: 'data/',
    });

    const logS3BucketParam = new CfnParameter(this, 'LogS3Bucket', {
      description: 'S3 bucket to save log',
      type: 'String',
    });

    const logS3PrefixParam = Parameters.createS3PrefixParameter(this, 'LogS3Prefix', {
      description: 'S3 object prefix to save log (optional)',
      default: 'kafka-connect/log/',
    });

    const pluginS3BucketParam = new CfnParameter(this, 'PluginS3Bucket', {
      description: 'S3 bucket to save plugin zip file',
      type: 'String',
    });

    const pluginS3PrefixParam = Parameters.createS3PrefixParameter(this, 'PluginS3Prefix', {
      description: 'S3 object prefix to save the plugin zip file',
      default: 'kafka-connect/plugin/',
    });

    const subnetIdsParam = new CfnParameter(this, 'SubnetIds', {
      description:
        'Amazon managed streaming for apache kafka (Amazon MSK) subnet ids',
      type: 'List<AWS::EC2::Subnet::Id>',
    });

    const kafkaBrokersParam = Parameters.createKafkaBrokersParameter(this, 'KafkaBrokers');
    const kafkaTopicParam = Parameters.createKafkaTopicParameter(this, 'KafkaTopic');
    const mskClusterNameParam = Parameters.createMskClusterNameParameter(this, 'MskClusterName');
    const securityGroupIdParam = Parameters.createMskSecurityGroupIdParameter(this, 'SecurityGroupId');
    const capacityDocLink = 'https://docs.aws.amazon.com/msk/latest/developerguide/msk-connect-connectors.html#msk-connect-capacity';

    const maxWorkerCountParam = new CfnParameter(this, 'MaxWorkerCount', {
      description: `Connector capacity max worker. Learn more ${capacityDocLink}`,
      type: 'Number',
      default: '3',
      minValue: 1,
    });

    const minWorkerCountParam = new CfnParameter(this, 'MinWorkerCount', {
      description: `Connector capacity min worker. Learn more ${capacityDocLink}`,
      type: 'Number',
      default: '1',
      minValue: 1,
    });

    const workerMcuCountParam = new CfnParameter(this, 'WorkerMcuCount', {
      description: `Connector capacity worker MCU. Learn more ${capacityDocLink}`,
      type: 'Number',
      default: '1',
      minValue: 1,
    });

    const defaultPluginUrl = 'https://d1i4a15mxbxib1.cloudfront.net/api/plugins/confluentinc/kafka-connect-s3/versions/10.2.2/confluentinc-kafka-connect-s3-10.2.2.zip';
    const pluginUrlParam = new CfnParameter(this, 'PluginUrl', {
      description: 'S3 sink plugin download url',
      type: 'String',
      allowedPattern: `^https?://${domainNamePattern}/.*\\.(zip|jar)$`,
      default: defaultPluginUrl,
    });

    const rotateIntervalMsParam = new CfnParameter(this, 'RotateIntervalMS', {
      description:
        'The time interval in milliseconds to invoke file commits, value of rotate.interval.ms',
      type: 'Number',
      default: '3000000',
      minValue: -1, // The value -1 indicates that this feature is disabled.
    });

    const flushSizeParam = new CfnParameter(this, 'FlushSize', {
      description:
        'Number of records written to store before invoking file commits',
      type: 'Number',
      default: '50000',
      minValue: 1,
    });

    const keyPattern = '[a-zA-Z0-9_.\\-]+';
    const valuePattern = '[a-zA-Z0-9_.\\-]+';
    const keyValuePattern = `\\s*\\\"${keyPattern}\\\"\\s*:\\s*\\\"${valuePattern}\\\"\\s*`;
    const jsonKeyValueStringPattern = `\\s*\\{(${keyValuePattern})(\\s*,${keyValuePattern})*\\}|\\{\\s*\\}\\s*`;
    const customConnectorConfigurationParam = new CfnParameter(
      this,
      'CustomConnectorConfiguration',
      {
        description:
          'Custom connector configuration, must be a JSON key value string',
        type: 'String',
        allowedPattern: `^${jsonKeyValueStringPattern}$`,
        constraintDescription: `CustomConnectorConfiguration must match pattern ${jsonKeyValueStringPattern}`,
        default: '{}',
      },
    );

    const logS3Bucket: IBucket = Bucket.fromBucketName(
      this,
      'from-logS3Bucket',
      logS3BucketParam.valueAsString,
    );

    const pluginS3Bucket: IBucket = Bucket.fromBucketName(
      this,
      'from-pluginS3Bucket',
      pluginS3BucketParam.valueAsString,
    );

    const dataS3Bucket: IBucket = Bucket.fromBucketName(
      this,
      'from-dataS3Bucket',
      dataS3BucketParam.valueAsString,
    );

    const securityGroup: ISecurityGroup = SecurityGroup.fromSecurityGroupId(
      this,
      'from-securityGroupId',
      securityGroupIdParam.valueAsString,
    );

    const kafkaConnectVersion = '2.7.1';
    const p: KafkaS3SinkConnectorProps = {
      projectId: projectIdParam.valueAsString,
      kafkaBrokers: kafkaBrokersParam.valueAsString,
      kafkaTopics: kafkaTopicParam.valueAsString,
      dataS3Bucket,
      dataS3Prefix: dataS3PrefixParam.valueAsString,
      pluginS3Bucket,
      pluginS3Prefix: pluginS3PrefixParam.valueAsString,
      logS3Bucket,
      logS3Prefix: logS3PrefixParam.valueAsString,
      securityGroup,
      subnetIds: Fn.join(',', subnetIdsParam.valueAsList),
      mskClusterName: mskClusterNameParam.valueAsString,
      maxWorkerCount: maxWorkerCountParam.valueAsNumber,
      minWorkerCount: minWorkerCountParam.valueAsNumber,
      workerMcuCount: workerMcuCountParam.valueAsNumber,
      pluginUrl: pluginUrlParam.valueAsString,
      kafkaConnectVersion,
      rotateIntervalMS: rotateIntervalMsParam.valueAsNumber,
      customConnectorConfiguration:
        customConnectorConfigurationParam.valueAsString,
      flushSize: flushSizeParam.valueAsNumber,
    };
    new KafkaS3SinkConnector(this, 'KafkaS3SinkConnector', p);
    addCdkNagToStack(this);
    addCfnNag(this);
  }
}

export function addCdkNagToStack(stack: Stack) {
  NagSuppressions.addStackSuppressions(stack, [
    {
      id: 'AwsSolutions-IAM4',
      reason:
        'LogRetention lambda role which are created by CDK uses AWSLambdaBasicExecutionRole',
    },
    {
      id: 'AwsSolutions-IAM5',
      reason:
        'LogRetention lambda policy which are created by CDK contains wildcard permissions',
    },
    {
      id: 'AwsSolutions-L1',
      reason: 'The lambda is created by CDK, CustomResource framework-onEvent',
    },
  ]);
}

function addCfnNag(stack: Stack) {
  const kafkaLambdaRolePolicyRulesToSuppress = [
    {
      id: 'W12',
      reason: 'Policy is generated by CDK, * resource for read only access',
    },
    {
      id: 'W76',
      reason: 'SPCM for IAM policy document is higher than 25',
    },
  ];

  const cfnNagList = [
    {
      paths_endswith: [
        's3-kafkaconnect-role/DefaultPolicy/Resource',
        'S3SinkConnectorCustomResourceLambdaRole/DefaultPolicy/Resource',
      ],
      rules_to_suppress: kafkaLambdaRolePolicyRulesToSuppress,
    },
  ];

  addCfnNagForLogRetention(stack);
  addCfnNagForCustomResourceProvider(stack, 'CDK built-in provider for MSKS3SinkConnector', 'SinkConnectorCustomResourceProvider', undefined);
  addCfnNagForCustomResourceProvider(stack, 'Metrics', 'MetricsCustomResourceProvider', '');

  addCfnNagToStack(stack, cfnNagList);
}

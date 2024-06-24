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

import {
  DOMAIN_NAME_PATTERN,
  PARAMETER_GROUP_LABEL_VPC,
  PARAMETER_GROUP_LABEL_DOMAIN,
  PARAMETER_LABEL_PRIVATE_SUBNETS,
  PARAMETER_LABEL_PUBLIC_SUBNETS,
  PARAMETER_LABEL_VPCID,
  PARAMETER_LABEL_CERTIFICATE_ARN,
  PARAMETER_LABEL_DOMAIN_NAME,
  STACK_CORS_PATTERN,
} from '@aws/clickstream-base-lib';
import { CfnParameter, CfnRule, Fn } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import { SINK_TYPE_MODE, ECS_INFRA_TYPE_MODE } from '../../common/model';
import { Parameters, SubnetParameterType } from '../../common/parameters';

export function createStackParameters(scope: Construct, props: {deliverToKinesis: boolean; deliverToKafka: boolean; deliverToS3: boolean}) {

  const workerStopTimeoutParam = new CfnParameter(scope, 'WorkerStopTimeout', {
    description: 'Worker container stop timeout seconds',
    type: 'Number',
    default: '330',
    minValue: 60,
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

  const commonParameters = createCommonParameters(scope);

  let kafkaKinesisS3ParamsGroup: any[] = [];
  let kafkaKinesisS3ParamsLabels = {};

  // Kafka
  let kafkaParams;
  let kafkaParamsLabels;
  if (props.deliverToKafka) {
    const kafkaParameters = createKafkaParameters(scope, kafkaKinesisS3ParamsGroup);
    kafkaParams = kafkaParameters.kafkaParams;
    kafkaParamsLabels = kafkaParameters.kafkaParamsLabels;
    kafkaKinesisS3ParamsLabels = { ...kafkaKinesisS3ParamsLabels, ...kafkaParamsLabels };

    new CfnRule(scope, 'sinkToKafkaAndKafkaBrokersAndKafkaTopic', {
      assertions: [
        {
          assert: Fn.conditionAnd(
            Fn.conditionNot(
              Fn.conditionEquals(kafkaParams.kafkaTopicParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(kafkaParams.kafkaBrokersParam.valueAsString, ''),
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
  let s3ParamsLabels;
  if (props.deliverToS3) {
    const s3Parameters = createS3Parameters(scope, kafkaKinesisS3ParamsGroup);
    s3Params = s3Parameters.s3Params;
    s3ParamsLabels = s3Parameters.s3ParamsLabels;
    kafkaKinesisS3ParamsLabels = { ...kafkaKinesisS3ParamsLabels, ...s3ParamsLabels };

    new CfnRule(scope, 'sinkToS3Rule', {
      assertions: [
        {
          assert: Fn.conditionAnd(
            Fn.conditionNot(
              Fn.conditionEquals(s3Params.s3DataBucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(s3Params.s3DataPrefixParam.valueAsString, ''),
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
  let kinesisParamsLabels;
  if (props.deliverToKinesis) {
    const kinesisParameters = createKinesisParameters(scope, kafkaKinesisS3ParamsGroup);
    kinesisParams = kinesisParameters.kinesisParams;
    kinesisParamsLabels = kinesisParameters.kinesisParamsLabels;
    kafkaKinesisS3ParamsLabels = { ...kafkaKinesisS3ParamsLabels, ...kinesisParamsLabels };

    new CfnRule(scope, 'sinkToKinesisRule', {
      assertions: [
        {
          assert:
          Fn.conditionAnd(
            Fn.conditionNot(
              Fn.conditionEquals(kinesisParams.kinesisDataS3BucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(kinesisParams.kinesisDataS3PrefixParam.valueAsString, ''),
            ),
          ),
          assertDescription:
          'kinesisDataS3Bucket and kinesisDataS3Prefix cannot be empty when sinkToKinesis=Yes',
        },
      ],
    });
  }

  const commonParameterGroups = createCommonParameterGroups(
    {
      vpcId: commonParameters.netWorkProps.vpcId,
      privateSubnets: commonParameters.netWorkProps.privateSubnets,
      domainNameParam: commonParameters.domainNameParam,
      certificateArnParam: commonParameters.certificateArnParam,
      serverEndpointPathParam: commonParameters.serverEndpointPathParam,
      serverCorsOriginParam: commonParameters.serverCorsOriginParam,
      protocolParam: commonParameters.protocolParam,
      enableApplicationLoadBalancerAccessLogParam: commonParameters.enableApplicationLoadBalancerAccessLogParam,
      logS3BucketParam: commonParameters.logS3BucketParam,
      logS3PrefixParam: commonParameters.logS3PrefixParam,
      serverMinParam: commonParameters.serverMinParam,
      serverMaxParam: commonParameters.serverMaxParam,
      warmPoolSizeParam: commonParameters.warmPoolSizeParam,
      scaleOnCpuUtilizationPercentParam: commonParameters.scaleOnCpuUtilizationPercentParam,
      projectIdParam: commonParameters.projectIdParam,
      publicSubnets: commonParameters.netWorkProps.publicSubnets,
    },
  );

  commonParameterGroups.push(... kafkaKinesisS3ParamsGroup);

  let commonParameterLabels = createCommonParameterLabels({
    vpcId: commonParameters.netWorkProps.vpcId,
    privateSubnets: commonParameters.netWorkProps.privateSubnets,
    domainNameParam: commonParameters.domainNameParam,
    certificateArnParam: commonParameters.certificateArnParam,
    serverEndpointPathParam: commonParameters.serverEndpointPathParam,
    serverCorsOriginParam: commonParameters.serverCorsOriginParam,
    protocolParam: commonParameters.protocolParam,
    enableApplicationLoadBalancerAccessLogParam: commonParameters.enableApplicationLoadBalancerAccessLogParam,
    logS3BucketParam: commonParameters.logS3BucketParam,
    logS3PrefixParam: commonParameters.logS3PrefixParam,
    serverMinParam: commonParameters.serverMinParam,
    serverMaxParam: commonParameters.serverMaxParam,
    warmPoolSizeParam: commonParameters.warmPoolSizeParam,
    scaleOnCpuUtilizationPercentParam: commonParameters.scaleOnCpuUtilizationPercentParam,
    projectIdParam: commonParameters.projectIdParam,
    publicSubnets: commonParameters.netWorkProps.publicSubnets,
  });

  commonParameterLabels = { ...commonParameterLabels, ... kafkaKinesisS3ParamsLabels };


  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: commonParameterGroups,
      ParameterLabels: commonParameterLabels,
    },
  };

  return {
    metadata,
    params: {
      vpcIdParam: commonParameters.netWorkProps.vpcId,
      publicSubnetIdsParam: commonParameters.netWorkProps.publicSubnets,
      privateSubnetIdsParam: commonParameters.netWorkProps.privateSubnets,
      domainNameParam: commonParameters.domainNameParam,
      certificateArnParam: commonParameters.certificateArnParam,
      serverEndpointPathParam: commonParameters.serverEndpointPathParam,
      serverCorsOriginParam: commonParameters.serverCorsOriginParam,
      protocolParam: commonParameters.protocolParam,
      enableApplicationLoadBalancerAccessLogParam: commonParameters.enableApplicationLoadBalancerAccessLogParam,
      logS3BucketParam: commonParameters.logS3BucketParam,
      logS3PrefixParam: commonParameters.logS3PrefixParam,
      notificationsTopicArnParam: notificationsTopicArnParam,
      serverMinParam: commonParameters.serverMinParam,
      serverMaxParam: commonParameters.serverMaxParam,
      warmPoolSizeParam: commonParameters.warmPoolSizeParam,
      scaleOnCpuUtilizationPercentParam: commonParameters.scaleOnCpuUtilizationPercentParam,
      kafkaParams,
      s3Params,
      kinesisParams,
      enableGlobalAcceleratorParam: commonParameters.enableGlobalAcceleratorParam,
      devModeParam: commonParameters.devModeParam,
      projectIdParam: commonParameters.projectIdParam,
      appIdsParam: commonParameters.appIdsParam,
      clickStreamSDKParam: commonParameters.clickStreamSDKParam,
      workerStopTimeoutParam,
      enableAuthenticationParam: commonParameters.enableAuthenticationParam,
      authenticationSecretArnParam: commonParameters.authenticationSecretArnParam,
    },
  };
}

export function createV2StackParameters(scope: Construct) {
  const sinkTypeParam = new CfnParameter(scope, 'SinkType', {
    description: 'sink type for data buffer',
    type: 'String',
    allowedValues: [SINK_TYPE_MODE.SINK_TYPE_S3, SINK_TYPE_MODE.SINK_TYPE_KDS, SINK_TYPE_MODE.SINK_TYPE_MSK],
    default: SINK_TYPE_MODE.SINK_TYPE_S3,
  });

  const ecsInfraTypeParam = new CfnParameter(scope, 'EcsInfraType', {
    description: 'Infrastructure type of ECS cluster',
    type: 'String',
    allowedValues: [ECS_INFRA_TYPE_MODE.EC2, ECS_INFRA_TYPE_MODE.FARGATE],
    default: ECS_INFRA_TYPE_MODE.EC2,
  });

  const workerStopTimeoutParam = new CfnParameter(scope, 'WorkerStopTimeout', {
    description: 'Worker container stop timeout seconds',
    type: 'Number',
    default: '120',
    minValue: 60,
    maxValue: 120,
  });

  const commonParameters = createCommonParameters(scope);

  let kafkaKinesisS3ParamsGroup: any[] = [];
  let kafkaKinesisS3ParamsLabels = {};

  // Kafka
  const { kafkaParams, kafkaParamsLabels } = createKafkaParameters(scope, kafkaKinesisS3ParamsGroup);
  kafkaKinesisS3ParamsLabels = { ...kafkaKinesisS3ParamsLabels, ...kafkaParamsLabels };

  new CfnRule(scope, 'sinkToKafkaAndKafkaBrokersAndKafkaTopic', {
    assertions: [
      {
        assert: Fn.conditionOr(
          Fn.conditionAnd(
            Fn.conditionEquals(sinkTypeParam.valueAsString, SINK_TYPE_MODE.SINK_TYPE_MSK),
            Fn.conditionNot(
              Fn.conditionEquals(kafkaParams.kafkaTopicParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(kafkaParams.kafkaBrokersParam.valueAsString, ''),
            ),
          ),
          Fn.conditionNot(Fn.conditionEquals(sinkTypeParam.valueAsString, SINK_TYPE_MODE.SINK_TYPE_MSK)),
        ),
        assertDescription:
        'kafkaTopic and kafkaBrokers cannot be empty',
      },
    ],
  });

  // S3
  const { s3Params, s3ParamsLabels } = createS3Parameters(scope, kafkaKinesisS3ParamsGroup);
  kafkaKinesisS3ParamsLabels = { ...kafkaKinesisS3ParamsLabels, ...s3ParamsLabels };
  new CfnRule(scope, 'sinkToS3Rule', {
    assertions: [
      {
        assert: Fn.conditionOr(
          Fn.conditionAnd(
            Fn.conditionEquals(sinkTypeParam.valueAsString, SINK_TYPE_MODE.SINK_TYPE_S3),
            Fn.conditionNot(
              Fn.conditionEquals(s3Params.s3DataBucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(s3Params.s3DataPrefixParam.valueAsString, ''),
            ),
          ),
          Fn.conditionNot(Fn.conditionEquals(sinkTypeParam.valueAsString, SINK_TYPE_MODE.SINK_TYPE_S3)),
        ),
        assertDescription:
          's3DataBucket and s3DataPrefix cannot be empty when sinkToS3Param=Yes',
      },
    ],
  });

  // Kinesis
  const { kinesisParams, kinesisParamsLabels } = createKinesisParameters(scope, kafkaKinesisS3ParamsGroup);
  kafkaKinesisS3ParamsLabels = { ...kafkaKinesisS3ParamsLabels, ...kinesisParamsLabels };

  new CfnRule(scope, 'sinkToKinesisRule', {
    assertions: [
      {
        assert: Fn.conditionOr(
          Fn.conditionAnd(
            Fn.conditionEquals(sinkTypeParam.valueAsString, SINK_TYPE_MODE.SINK_TYPE_KDS),
            Fn.conditionNot(
              Fn.conditionEquals(kinesisParams.kinesisDataS3BucketParam.valueAsString, ''),
            ),
            Fn.conditionNot(
              Fn.conditionEquals(kinesisParams.kinesisDataS3PrefixParam.valueAsString, ''),
            ),
          ),
          Fn.conditionNot(Fn.conditionEquals(sinkTypeParam.valueAsString, SINK_TYPE_MODE.SINK_TYPE_KDS)),
        ),
        assertDescription:
        'kinesisDataS3Bucket and kinesisDataS3Prefix cannot be empty when sinkToKinesis=Yes',
      },
    ],
  });

  const commonParameterGroups = createCommonParameterGroups(
    {
      vpcId: commonParameters.netWorkProps.vpcId,
      privateSubnets: commonParameters.netWorkProps.privateSubnets,
      domainNameParam: commonParameters.domainNameParam,
      certificateArnParam: commonParameters.certificateArnParam,
      serverEndpointPathParam: commonParameters.serverEndpointPathParam,
      serverCorsOriginParam: commonParameters.serverCorsOriginParam,
      protocolParam: commonParameters.protocolParam,
      enableApplicationLoadBalancerAccessLogParam: commonParameters.enableApplicationLoadBalancerAccessLogParam,
      logS3BucketParam: commonParameters.logS3BucketParam,
      logS3PrefixParam: commonParameters.logS3PrefixParam,
      serverMinParam: commonParameters.serverMinParam,
      serverMaxParam: commonParameters.serverMaxParam,
      warmPoolSizeParam: commonParameters.warmPoolSizeParam,
      scaleOnCpuUtilizationPercentParam: commonParameters.scaleOnCpuUtilizationPercentParam,
      projectIdParam: commonParameters.projectIdParam,
      publicSubnets: commonParameters.netWorkProps.publicSubnets,
    },
  );

  commonParameterGroups.push(... kafkaKinesisS3ParamsGroup);

  let commonParameterLabels = createCommonParameterLabels({
    vpcId: commonParameters.netWorkProps.vpcId,
    privateSubnets: commonParameters.netWorkProps.privateSubnets,
    domainNameParam: commonParameters.domainNameParam,
    certificateArnParam: commonParameters.certificateArnParam,
    serverEndpointPathParam: commonParameters.serverEndpointPathParam,
    serverCorsOriginParam: commonParameters.serverCorsOriginParam,
    protocolParam: commonParameters.protocolParam,
    enableApplicationLoadBalancerAccessLogParam: commonParameters.enableApplicationLoadBalancerAccessLogParam,
    logS3BucketParam: commonParameters.logS3BucketParam,
    logS3PrefixParam: commonParameters.logS3PrefixParam,
    serverMinParam: commonParameters.serverMinParam,
    serverMaxParam: commonParameters.serverMaxParam,
    warmPoolSizeParam: commonParameters.warmPoolSizeParam,
    scaleOnCpuUtilizationPercentParam: commonParameters.scaleOnCpuUtilizationPercentParam,
    projectIdParam: commonParameters.projectIdParam,
    publicSubnets: commonParameters.netWorkProps.publicSubnets,
  });

  commonParameterLabels = { ...commonParameterLabels, ... kafkaKinesisS3ParamsLabels };


  const metadata = {
    'AWS::CloudFormation::Interface': {
      ParameterGroups: commonParameterGroups,
      ParameterLabels: commonParameterLabels,
    },
  };

  return {
    metadata,
    params: {
      vpcIdParam: commonParameters.netWorkProps.vpcId,
      publicSubnetIdsParam: commonParameters.netWorkProps.publicSubnets!, //NOSONAR cast is safe
      privateSubnetIdsParam: commonParameters.netWorkProps.privateSubnets,
      domainNameParam: commonParameters.domainNameParam,
      certificateArnParam: commonParameters.certificateArnParam,
      serverEndpointPathParam: commonParameters.serverEndpointPathParam,
      serverCorsOriginParam: commonParameters.serverCorsOriginParam,
      protocolParam: commonParameters.protocolParam,
      enableApplicationLoadBalancerAccessLogParam: commonParameters.enableApplicationLoadBalancerAccessLogParam,
      logS3BucketParam: commonParameters.logS3BucketParam,
      logS3PrefixParam: commonParameters.logS3PrefixParam,
      serverMinParam: commonParameters.serverMinParam,
      serverMaxParam: commonParameters.serverMaxParam,
      warmPoolSizeParam: commonParameters.warmPoolSizeParam,
      scaleOnCpuUtilizationPercentParam: commonParameters.scaleOnCpuUtilizationPercentParam,
      kafkaParams,
      s3Params,
      kinesisParams,
      enableGlobalAcceleratorParam: commonParameters.enableGlobalAcceleratorParam,
      devModeParam: commonParameters.devModeParam,
      projectIdParam: commonParameters.projectIdParam,
      appIdsParam: commonParameters.appIdsParam,
      clickStreamSDKParam: commonParameters.clickStreamSDKParam,
      workerStopTimeoutParam,
      sinkTypeParam,
      ecsInfraTypeParam,
      enableAuthenticationParam: commonParameters.enableAuthenticationParam,
      authenticationSecretArnParam: commonParameters.authenticationSecretArnParam,
    },
  };
}

function createCommonParameters(scope: Construct) {
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

  const warmPoolSizeParam = new CfnParameter(scope, 'WarmPoolSize', {
    description: 'Server autoscaling warm pool min size',
    type: 'Number',
    default: '0',
    minValue: 0,
  });

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
    allowedPattern: STACK_CORS_PATTERN,
    constraintDescription: `ServerCorsOrigin must match pattern ${STACK_CORS_PATTERN}`,
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

  const serverMinParam = new CfnParameter(scope, 'ServerMin', {
    description: 'Server and task size min number',
    type: 'Number',
    default: '2',
    minValue: 0,
  });

  const serverMaxParam = new CfnParameter(scope, 'ServerMax', {
    description: 'Server and task size max number',
    type: 'Number',
    default: '2',
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
      allowedPattern: '^$|^arn:aws(-cn|-us-gov)?:secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9-\/]+$',
      constraintDescription:
      'AuthenticationSecretArn must match pattern ^$|^arn:aws(-cn|-us-gov)?:secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9-\/]+$',
    },
  );

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

  return {
    netWorkProps,
    domainNameParam,
    certificateArnParam,
    serverEndpointPathParam,
    serverCorsOriginParam,
    protocolParam,
    enableApplicationLoadBalancerAccessLogParam,
    devModeParam,
    projectIdParam,
    appIdsParam,
    warmPoolSizeParam,
    clickStreamSDKParam,
    serverMinParam,
    serverMaxParam,
    scaleOnCpuUtilizationPercentParam,
    enableGlobalAcceleratorParam,
    enableAuthenticationParam,
    authenticationSecretArnParam,
    logS3BucketParam,
    logS3PrefixParam,
  };
}

function createCommonParameterGroups(props:
{
  vpcId: CfnParameter;
  privateSubnets: CfnParameter;
  domainNameParam: CfnParameter;
  certificateArnParam: CfnParameter;
  serverEndpointPathParam: CfnParameter;
  serverCorsOriginParam: CfnParameter;
  protocolParam: CfnParameter;
  enableApplicationLoadBalancerAccessLogParam: CfnParameter;
  logS3BucketParam: CfnParameter;
  logS3PrefixParam: CfnParameter;
  serverMinParam: CfnParameter;
  serverMaxParam: CfnParameter;
  warmPoolSizeParam: CfnParameter;
  scaleOnCpuUtilizationPercentParam: CfnParameter;
  projectIdParam: CfnParameter;
  publicSubnets?: CfnParameter;
},
) {
  const networkParamGroup = [props.vpcId.logicalId];
  if (props.publicSubnets) {networkParamGroup.push(props.publicSubnets.logicalId);}
  networkParamGroup.push(props.privateSubnets.logicalId);
  return [
    {
      Label: { default: 'Project' },
      Parameters: [
        props.projectIdParam.logicalId,
      ],
    },

    {
      Label: { default: PARAMETER_GROUP_LABEL_VPC },
      Parameters: networkParamGroup,
    },

    {
      Label: { default: PARAMETER_GROUP_LABEL_DOMAIN },
      Parameters: [
        props.domainNameParam.logicalId,
        props.certificateArnParam.logicalId,
      ],
    },

    {
      Label: { default: 'Server' },
      Parameters: [
        props.protocolParam.logicalId,
        props.serverEndpointPathParam.logicalId,
        props.serverCorsOriginParam.logicalId,
        props.serverMaxParam.logicalId,
        props.serverMinParam.logicalId,
        props.scaleOnCpuUtilizationPercentParam.logicalId,
        props.warmPoolSizeParam.logicalId,
      ],
    },
    {
      Label: { default: 'Logs' },
      Parameters: [
        props.enableApplicationLoadBalancerAccessLogParam.logicalId,
        props.logS3BucketParam.logicalId,
        props.logS3PrefixParam.logicalId,

      ],
    },
  ];
}

function createCommonParameterLabels(props:
{
  vpcId: CfnParameter;
  privateSubnets: CfnParameter;
  domainNameParam: CfnParameter;
  certificateArnParam: CfnParameter;
  serverEndpointPathParam: CfnParameter;
  serverCorsOriginParam: CfnParameter;
  protocolParam: CfnParameter;
  enableApplicationLoadBalancerAccessLogParam: CfnParameter;
  logS3BucketParam: CfnParameter;
  logS3PrefixParam: CfnParameter;
  serverMinParam: CfnParameter;
  serverMaxParam: CfnParameter;
  warmPoolSizeParam: CfnParameter;
  scaleOnCpuUtilizationPercentParam: CfnParameter;
  projectIdParam: CfnParameter;
  publicSubnets?: CfnParameter;
},

) {
  let publicLabel = {};
  if (props.publicSubnets) {
    publicLabel = {
      [props.publicSubnets.logicalId]: {
        default: PARAMETER_LABEL_PUBLIC_SUBNETS,
      },
    };
  }
  return {
    [props.projectIdParam.logicalId]: {
      default: 'Project Id',
    },

    [props.vpcId.logicalId]: {
      default: PARAMETER_LABEL_VPCID,
    },

    ...publicLabel,

    [props.privateSubnets.logicalId]: {
      default: PARAMETER_LABEL_PRIVATE_SUBNETS,
    },

    [props.domainNameParam.logicalId]: {
      default: PARAMETER_LABEL_DOMAIN_NAME,
    },

    [props.certificateArnParam.logicalId]: {
      default: PARAMETER_LABEL_CERTIFICATE_ARN,
    },

    [props.serverEndpointPathParam.logicalId]: {
      default: 'Server endpoint path',
    },

    [props.serverCorsOriginParam.logicalId]: {
      default: 'Server CORS origin',
    },

    [props.protocolParam.logicalId]: {
      default: 'Protocol',
    },

    [props.enableApplicationLoadBalancerAccessLogParam.logicalId]: {
      default: 'Enable application load balancer access log',
    },

    [props.logS3BucketParam.logicalId]: {
      default: 'S3 bucket name to save log',
    },

    [props.logS3PrefixParam.logicalId]: {
      default: 'S3 object prefix to save log',
    },

    [props.serverMinParam.logicalId]: {
      default: 'Server size min number',
    },

    [props.serverMaxParam.logicalId]: {
      default: 'Server size max number',
    },

    [props.warmPoolSizeParam.logicalId]: {
      default: 'Server autoscaling warm pool min size',
    },

    [props.scaleOnCpuUtilizationPercentParam.logicalId]: {
      default: 'Autoscaling on CPU utilization percent',
    },
  };
}

function createS3Parameters(scope: Construct, kafkaKinesisS3ParamsGroup: any[]) {
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

  const s3Params = {
    s3DataBucketParam,
    s3DataPrefixParam,
    s3BatchMaxBytesParam,
    s3BatchTimeoutParam,
  };

  kafkaKinesisS3ParamsGroup.push( {
    Label: { default: 'S3 Bucket' },
    Parameters: [
      s3DataBucketParam.logicalId,
      s3DataPrefixParam.logicalId,
      s3BatchMaxBytesParam.logicalId,
      s3BatchTimeoutParam.logicalId,
    ],
  });

  const s3ParamsLabels = {
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
  };

  return { s3Params, s3ParamsLabels };
}

function createKinesisParameters(scope: Construct, kafkaKinesisS3ParamsGroup: any[]) {
  const kinesisDataS3BucketParam = Parameters.createS3BucketParameter(scope, 'KinesisDataS3Bucket', {
    description: 'S3 bucket name to save data from Kinesis Data Stream',
    default: '',
  });

  const kinesisDataS3PrefixParam = Parameters.createS3PrefixParameter(scope, 'KinesisDataS3Prefix', {
    description: 'S3 object prefix to save data from Kinesis Data Stream',
    default: 'kinesis-data/',
  });

  const { kinesisStreamModeParam, kinesisShardCountParam, kinesisDataRetentionHoursParam } = Parameters.createKinesisParameters(scope);

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
  const kinesisParams = {
    kinesisDataS3BucketParam,
    kinesisDataS3PrefixParam,
    kinesisStreamModeParam,
    kinesisShardCountParam,
    kinesisDataRetentionHoursParam,
    kinesisBatchSizeParam,
    kinesisMaxBatchingWindowSecondsParam,
  };

  kafkaKinesisS3ParamsGroup.push({
    Label: { default: 'Kinesis Data Stream' },
    Parameters: [
      kinesisDataS3BucketParam.logicalId,
      kinesisDataS3PrefixParam.logicalId,
      kinesisStreamModeParam.logicalId,
      kinesisShardCountParam.logicalId,
      kinesisDataRetentionHoursParam.logicalId,
      kinesisBatchSizeParam.logicalId,
      kinesisMaxBatchingWindowSecondsParam.logicalId,
    ],
  });

  const kinesisParamsLabels = {
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
  return { kinesisParams, kinesisParamsLabels };
}

function createKafkaParameters(scope: Construct, kafkaKinesisS3ParamsGroup: any[]) {
  const kafkaBrokersParam = Parameters.createKafkaBrokersParameter(scope, 'KafkaBrokers', true, { default: '' });
  const kafkaTopicParam = Parameters.createKafkaTopicParameter(scope, 'KafkaTopic', true, { default: '' });
  const mskClusterNameParam = Parameters.createMskClusterNameParameter(scope, 'MskClusterName', { default: '' });
  const mskSecurityGroupIdParam = Parameters.createMskSecurityGroupIdParameter(scope, 'MskSecurityGroupId', true, { default: '' });

  const kafkaParams = {
    kafkaBrokersParam,
    kafkaTopicParam,
    mskSecurityGroupIdParam,
    mskClusterNameParam,
  };

  kafkaKinesisS3ParamsGroup.push({
    Label: { default: 'Kafka Cluster' },
    Parameters: [
      kafkaBrokersParam.logicalId,
      kafkaTopicParam.logicalId,
      mskClusterNameParam.logicalId,
      mskSecurityGroupIdParam.logicalId,
    ],
  });

  const kafkaParamsLabels = {
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
  return { kafkaParams, kafkaParamsLabels };
}
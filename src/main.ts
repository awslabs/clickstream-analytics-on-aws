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

import { Architecture } from '@aws-sdk/client-lambda';
import { Annotations, App, Aspects, CfnCondition, Fn, IAspect, Stack } from 'aws-cdk-lib';
import { CfnFunction, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BootstraplessStackSynthesizer, CompositeECRRepositoryAspect } from 'cdk-bootstrapless-synthesizer';
import { AwsSolutionsChecks, NagPackSuppression, NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';
import { ApplicationLoadBalancerControlPlaneStack } from './alb-control-plane-stack';
import { CloudFrontControlPlaneStack } from './cloudfront-control-plane-stack';
import { commonCdkNagRules } from './common/cfn-nag';
import { SolutionInfo } from './common/solution-info';
import { DataAnalyticsRedshiftStack } from './data-analytics-redshift-stack';
import { DataModelingAthenaStack } from './data-modeling-athena-stack';
import { DataPipelineStack } from './data-pipeline-stack';
import { DataReportingQuickSightStack } from './data-reporting-quicksight-stack';
import { IngestionServerStack } from './ingestion-server-stack';
import { IngestionServerStackV2 } from './ingestion-server-v2-stack';
import { KafkaS3SinkConnectorStack } from './kafka-s3-connector-stack';
import { MetricsStack } from './metrics-stack';
import { SolutionNodejsFunction } from './private/function';
import { ServiceCatalogAppregistryStack } from './service-catalog-appregistry-stack';

const app = new App();

function stackSuppressions(stacks: Stack[], suppressions: NagPackSuppression[]) {
  stacks.forEach(s => {
    NagSuppressions.addStackSuppressions(s, suppressions, true);
  });
}

if (!(/true/i).test(app.node.tryGetContext('ignoreWebConsoleSynth'))) {
  const commonSuppressionRulesForALBLambdaPattern = [
    { id: 'AwsSolutions-IAM5', reason: 'allow the logs of Lambda publishing to CloudWatch Logs with ambiguous logstream name' },
    { id: 'AwsSolutions-EC23', reason: 'It is a public facing service so it works as design' },
  ];

  stackSuppressions([
    new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-control-plane-stack', {
      existingVpc: true,
      internetFacing: true,
      useCustomDomain: false,
      useExistingOIDCProvider: true,
      synthesizer: synthesizer(),
    }),
    new ApplicationLoadBalancerControlPlaneStack(app, 'public-exist-vpc-custom-domain-control-plane-stack', {
      existingVpc: true,
      internetFacing: true,
      useCustomDomain: true,
      useExistingOIDCProvider: false,
      synthesizer: synthesizer(),
    }),
  ], commonSuppressionRulesForALBLambdaPattern);


  stackSuppressions([
    new ApplicationLoadBalancerControlPlaneStack(app, 'private-exist-vpc-control-plane-stack', {
      existingVpc: true,
      internetFacing: false,
      useCustomDomain: false,
      useExistingOIDCProvider: true,
      synthesizer: synthesizer(),
    }),
    new ApplicationLoadBalancerControlPlaneStack(app, 'private-exist-vpc-cognito-control-plane-stack', {
      existingVpc: true,
      internetFacing: false,
      useCustomDomain: true,
      useExistingOIDCProvider: false,
      synthesizer: synthesizer(),
    }),
  ], commonSuppressionRulesForALBLambdaPattern);

  const commonSuppressionRulesForCloudFrontS3Pattern = [
    { id: 'AwsSolutions-IAM4', reason: 'Cause by CDK BucketDeployment construct (aws-cdk-lib/aws-s3-deployment)' },
    { id: 'AwsSolutions-IAM5', reason: 'Cause by CDK BucketDeployment construct (aws-cdk-lib/aws-s3-deployment)' },
    { id: 'AwsSolutions-APIG2', reason: 'The REST API input validation in Lambda(Express) code, the front ApiGateway does not need repeated validation.' },
    { id: 'AwsSolutions-COG4', reason: 'The REST API validate input via OIDC authorizer, there is no need to use Cognito user pool authorizer.' },
  ];

  stackSuppressions([
    new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-cn', {
      targetToCNRegions: true,
      useCustomDomainName: true,
      synthesizer: synthesizer(),
    }),
  ], [
    ...commonSuppressionRulesForCloudFrontS3Pattern,
    { id: 'AwsSolutions-CFR4', reason: 'TLSv1 is required in China regions' },
  ]);

  const commonSuppressionRulesForCloudFrontS3PatternInGlobal = [
    ...commonSuppressionRulesForCloudFrontS3Pattern,
    { id: 'AwsSolutions-CFR4', reason: 'Cause by using default default CloudFront viewer certificate' },
    { id: 'AwsSolutions-L1', reason: 'Managed by CDK Cognito module for get service token' },
  ];

  stackSuppressions([
    new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global', {
      synthesizer: synthesizer(),
    }),
    new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global-oidc', {
      useExistingOIDCProvider: true,
      synthesizer: synthesizer(),
    }),
  ], commonSuppressionRulesForCloudFrontS3PatternInGlobal);

  stackSuppressions([
    new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global-customdomain', {
      useCustomDomainName: true,
      synthesizer: synthesizer(),
    }),
    new CloudFrontControlPlaneStack(app, 'cloudfront-s3-control-plane-stack-global-customdomain-oidc', {
      useCustomDomainName: true,
      useExistingOIDCProvider: true,
      synthesizer: synthesizer(),
    }),
  ], [
    ...commonSuppressionRulesForCloudFrontS3PatternInGlobal,
    { id: 'AwsSolutions-L1', reason: 'Caused by CDK DnsValidatedCertificate resource when request ACM certificate' },
  ]);
}

stackSuppressions([
  new IngestionServerStack(app, app.node.tryGetContext('ingestToKafkaStackName') ?? 'ingestion-server-kafka-stack', { //To Kafka
    synthesizer: synthesizer(),
    deliverToKafka: true,
    deliverToKinesis: false,
    deliverToS3: false,
  }),
  new IngestionServerStack(app, app.node.tryGetContext('ingestToKinesisStackName') ?? 'ingestion-server-kinesis-stack', { //To Kinesis
    synthesizer: synthesizer(),
    deliverToKafka: false,
    deliverToKinesis: true,
    deliverToS3: false,
  }),
  new IngestionServerStack(app, app.node.tryGetContext('ingestToS3StackName') ?? 'ingestion-server-s3-stack', { //To S3
    synthesizer: synthesizer(),
    deliverToKafka: false,
    deliverToKinesis: false,
    deliverToS3: true,
  }),

  // for Ingestion V2
  new IngestionServerStackV2(app, 'ingestion-server-v2-stack', { //To Ingestion V2
    synthesizer: synthesizer(),
  }),  
], [
  ...commonCdkNagRules,
  {
    id: 'AwsSolutions-AS3',
    reason: 'notifications configuration for autoscaling group is optional',
  },
  {
    id: 'AwsSolutions-ECS2',
    reason: 'No secret data in environment variables',
  },
  {
    id: 'AwsSolutions-EC23',
    reason: 'The ALB should be public',
  },
  {
    id: 'AwsSolutions-EC26',
    reason: 'The EC2 instances used by ECS don\'t persist the customer\'s data',
  },
  {
    id: 'AwsSolutions-ELB2',
    reason: 'The ALB log is optional by the customer\'s selection',
  },
  {
    id: 'AwsSolutions-SNS2',
    reason: 'The SNS Topic is set by cfnParameter, not created in this stack',
  },
  {
    id: 'AwsSolutions-SNS3',
    reason: 'The SNS Topic is set by cfnParameter, not created in this stack',
  },
]);

new KafkaS3SinkConnectorStack(app, app.node.tryGetContext('kafkaS3SinkStackName') ?? 'kafka-s3-sink-stack', { // Kafka S3 sink connector
  synthesizer: synthesizer(),
});

new DataPipelineStack(app, app.node.tryGetContext('dataProcessingStackName') ?? 'data-pipeline-stack', {
  synthesizer: synthesizer(),
});

stackSuppressions([
  new DataAnalyticsRedshiftStack(app, app.node.tryGetContext('modelRedshiftStackName') ?? 'data-analytics-redshift-stack', {
    synthesizer: synthesizer(),
  }),
], commonCdkNagRules);

new DataModelingAthenaStack(app, app.node.tryGetContext('modelAthenaStackName') ?? 'data-modeling-athena-stack', {
  synthesizer: synthesizer(),
});

stackSuppressions([
  new DataReportingQuickSightStack(app, app.node.tryGetContext('reportingStackName') ?? 'data-reporting-quicksight-stack', {
    synthesizer: synthesizer(),
  }),
], commonCdkNagRules);

stackSuppressions([
  new MetricsStack(app, app.node.tryGetContext('metricsStackName') ?? 'metrics-stack', {
    synthesizer: synthesizer(),
  }),
], commonCdkNagRules);

new ServiceCatalogAppregistryStack(app, app.node.tryGetContext('appRegistryStackName') ?? 'service-catalog-appregistry-stack', {
  synthesizer: synthesizer(),
});

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
if (process.env.USE_BSS) {
  Aspects.of(app).add(new CompositeECRRepositoryAspect());
}

class UserAgentAspect implements IAspect {

  public visit(node: IConstruct): void {
    this.applyUserAgentAspect(node);
  }

  private applyUserAgentAspect(node: IConstruct): void {
    if (node instanceof Function) {
      node.addEnvironment('USER_AGENT_STRING', `AWSSOLUTION/${SolutionInfo.SOLUTION_ID}/${SolutionInfo.SOLUTION_VERSION}`);
    }
  }
}
Aspects.of(app).add(new UserAgentAspect());

class NodejsFunctionSanityAspect implements IAspect {

  public visit(node: IConstruct): void {
    if (node instanceof NodejsFunction) {
      if (!(node instanceof SolutionNodejsFunction)) {
        Annotations.of(node).addError('Directly using NodejsFunction is not allowed in the solution. Use SolutionNodejsFunction instead.');
      }
      if (node.runtime != Runtime.NODEJS_18_X) {
        Annotations.of(node).addError('You must use Nodejs 18.x runtime for Lambda with javascript in this solution.');
      }
    }
  }
}
Aspects.of(app).add(new NodejsFunctionSanityAspect());

class CNLambdaFunctionAspect implements IAspect {

  private conditionCache: { [key: string]: CfnCondition } = {};

  public visit(node: IConstruct): void {
    if (node instanceof Function) {
      const func = node.node.defaultChild as CfnFunction;
      if (func.loggingConfig) {
        func.addPropertyOverride('LoggingConfig',
          Fn.conditionIf(this.awsChinaCondition(Stack.of(node)).logicalId,
            Fn.ref('AWS::NoValue'), {
              LogFormat: (func.loggingConfig as CfnFunction.LoggingConfigProperty).logFormat,
              ApplicationLogLevel: (func.loggingConfig as CfnFunction.LoggingConfigProperty).applicationLogLevel,
              LogGroup: (func.loggingConfig as CfnFunction.LoggingConfigProperty).logGroup,
              SystemLogLevel: (func.loggingConfig as CfnFunction.LoggingConfigProperty).systemLogLevel,
            }));
      }
      if (func.architectures && func.architectures[0] == Architecture.arm64) {
        func.addPropertyOverride('Architectures',
          Fn.conditionIf(this.awsChinaCondition(Stack.of(node)).logicalId,
            Fn.ref('AWS::NoValue'), func.architectures));
      }
    }
  }

  private awsChinaCondition(stack: Stack): CfnCondition {
    const conditionName = 'AWSCNCondition';
    // Check if the resource already exists
    const existingResource = this.conditionCache[stack.artifactId];

    if (existingResource) {
      return existingResource;
    } else {
      const awsCNCondition = new CfnCondition(stack, conditionName, {
        expression: Fn.conditionEquals('aws-cn', stack.partition),
      });
      this.conditionCache[stack.artifactId] = awsCNCondition;
      return awsCNCondition;
    }
  }
}
Aspects.of(app).add(new CNLambdaFunctionAspect());

function synthesizer() {
  return process.env.USE_BSS ? new BootstraplessStackSynthesizer(): undefined;
}
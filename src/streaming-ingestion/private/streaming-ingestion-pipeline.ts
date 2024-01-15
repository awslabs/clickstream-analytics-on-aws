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

import { join } from 'path';
import { Arn, ArnFormat, Aws, CfnResource, CustomResource, Duration, Stack } from 'aws-cdk-lib';
import { AccountPrincipal, CompositePrincipal, IRole, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { StreamingIngestionPipelineCfnProps } from './model';
import { addCfnNagSuppressRules } from '../../common/cfn-nag';
import { createLambdaRole } from '../../common/lambda';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { POWERTOOLS_ENVS } from '../../common/powertools';
import { SolutionNodejsFunction } from '../../private/function';
import { STREAM_NAME_PREFIX } from '../common/constant';

export class StreamingIngestionPipeline extends Construct {
  readonly streamingIngestionAssociateRedshiftRole: IRole;
  readonly streamingIngestionPipelineRole: IRole;
  constructor(scope: Construct, id: string, props: StreamingIngestionPipelineCfnProps) {
    super(scope, id);

    this.streamingIngestionAssociateRedshiftRole = new Role(this, 'StreamingIngestionAssociateRedshiftRole', {
      assumedBy: new CompositePrincipal(new AccountPrincipal(Aws.ACCOUNT_ID), new ServicePrincipal('redshift.amazonaws.com')),
    });

    this.streamingIngestionPipelineRole = new Role(this, 'StreamingIngestionPipelineRole', {
      assumedBy: new CompositePrincipal(new AccountPrincipal(Aws.ACCOUNT_ID), new ServicePrincipal('kinesisanalytics.amazonaws.com')),
      inlinePolicies: {
        'streaming-ingestion-pipeline': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'kinesisanalytics:CreateApplication',
                'kinesisanalytics:DescribeApplication',
                'kinesisanalytics:UpdateApplication',
                'kinesisanalytics:StartApplication',
                'kinesisanalytics:StopApplication',
                'kinesisanalytics:DeleteApplication',
              ],
              resources: ['*'],
            }),
            new PolicyStatement({
              actions: [
                'kinesis:CreateStream',
                'kinesis:StartStreamEncryption',
                'kinesis:DescribeStream',
                'kinesis:GetShardIterator',
                'kinesis:DescribeStreamSummary',
                'kinesis:GetRecords',
                'kinesis:PutRecord',
                'kinesis:PutRecords',
                'kinesis:DeleteStream',
              ],
              resources: [
                Arn.format({
                  service: 'kinesis',
                  resource: 'stream',
                  resourceName: STREAM_NAME_PREFIX + '*',
                  arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                }, Stack.of(this)),
              ],
            }),
            new PolicyStatement({
              actions: [
                'kinesis:GetShardIterator',
                'kinesis:DescribeStreamSummary',
                'kinesis:GetRecords',
              ],
              resources: [
                Arn.format({
                  service: 'kinesis',
                  resource: 'stream',
                  resourceName: props.kinesisSourceStreamName,
                  arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                }, Stack.of(this)),
              ],
            }),
            new PolicyStatement({
              actions: [
                'kinesis:ListShards',
                'kinesis:ListStreams',
              ],
              resources: [
                '*',
              ],
            }),
            new PolicyStatement({
              actions: [
                'iam:PassRole',
              ],
              resources: [
                '*',
              ],
              conditions: {
                StringEquals: {
                  'aws:RequestedRegion': Stack.of(scope).region,
                },
              },
            }),
          ],
        }),
        'streaming-ingestion-kms': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'kms:DescribeKey',
              ],
              resources: [
                Arn.format({
                  service: 'kms',
                  resource: 'key',
                  resourceName: '*',
                  arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
                }, Stack.of(this)),
              ],
            }),
          ],
        }),
        'streaming-ingestion-s3': new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                's3:ListBucket',
                's3:GetObject',
              ],
              resources: [
                props.applicationCodeBucketARN,
                props.applicationCodeBucketARN+'/*',
              ],
            }),
          ],
        }),
        'streaming-ingestion-ec2': new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                '*',
              ],
              actions: [
                'ec2:DescribeVpcs',
                'ec2:DescribeSubnets',
                'ec2:DescribeSecurityGroups',
                'ec2:DescribeDhcpOptions',

                'ec2:CreateNetworkInterface',
                'ec2:CreateNetworkInterfacePermission',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
              ],
              conditions: {
                StringEquals: {
                  'aws:RequestedRegion': Stack.of(scope).region,
                },
              },
            }),
          ],
        }),
        'streaming-ingestion-log': new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                '*',
              ],
              actions: [
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:PutLogEvents',
              ],
              conditions: {
                StringEquals: {
                  'aws:RequestedRegion': Stack.of(scope).region,
                },
              },
            }),
          ],
        }),
        'streaming-ingestion-cloudwatch': new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: [
                props.logStreamArn,
              ],
              actions: [
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
              ],
              conditions: {
                StringEquals: {
                  'aws:RequestedRegion': Stack.of(scope).region,
                },
              },
            }),
          ],
        }),
        'streaming-ingestion-iam': new PolicyDocument({
          statements: [
            new PolicyStatement({
              resources: ['*'],
              actions: [
                'iam:PutRolePolicy',
              ],
              conditions: {
                StringEquals: {
                  'aws:RequestedRegion': Stack.of(scope).region,
                },
              },
            }),
          ],
        }),
      },
      description: `Managed by ${Stack.of(this).templateOptions.description} to manage the lifecycle of Streaming Ingestion.`,
    });

    const streamingIngestionPipeline = this.createStreamingIngestionPipelineCustomResource(props);
    addCfnNagSuppressRules(
      streamingIngestionPipeline.node.defaultChild as CfnResource,
      [
        {
          id: 'W28',
          reason: 'Set the name of KDS with random suffix to restrict the length of name which has limited length support in Redshift streaming ingestion',
        },
        {
          id: 'W89',
          reason: 'Lambda function is only used by streaming-ingestion for deployment as cloudformation custom resources or per product design, no need to be deployed in VPC',
        },
        {
          id: 'W92',
          reason: 'Lambda function is only used by streaming-ingestion for deployment as cloudformation custom resources or per product design, no need to set ReservedConcurrentExecutions',
        },
      ],
    );
  }

  private createStreamingIngestionPipelineCustomResource(props: StreamingIngestionPipelineCfnProps): CustomResource {
    const eventHandler = this.createStreamingIngestionPipelineFunction();
    const policy = attachListTagsPolicyForFunction(this, 'CreateStreamingIngestionPipelineFunc', eventHandler);
    this.streamingIngestionPipelineRole.grantAssumeRole(eventHandler.grantPrincipal);

    const provider = new Provider(
      this,
      'CreateStreamingIngestionKinesisCustomResourceProvider',
      {
        onEventHandler: eventHandler,
        logRetention: RetentionDays.ONE_WEEK,
      },
    );

    const cr = new CustomResource(this, 'CreateStreamingIngestionPipelineCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        projectId: props.projectId,
        appIds: props.appIds,
        stackShortId: props.stackShortId,
        streamingIngestionPipelineRoleArn: this.streamingIngestionPipelineRole.roleArn,
        streamingIngestionAssociateRedshiftRoleArn: this.streamingIngestionAssociateRedshiftRole.roleArn,
        streamMode: props.streamMode,
        onDemandKinesisProps: props.onDemandKinesisProps,
        provisionedKinesisProps: props.provisionedKinesisProps,
        kinesisSourceStreamName: props.kinesisSourceStreamName,
        parallelism: props.parallelism,
        parallelismPerKPU: props.parallelismPerKPU,
        applicationCodeBucketARN: props.applicationCodeBucketARN,
        applicationCodeFileKey: props.applicationCodeFileKey,
        securityGroupIds: props.securityGroupIds,
        subnetIds: props.subnetIds,
        logStreamArn: props.logStreamArn,
      },
    });

    cr.node.addDependency(policy);

    return cr;
  }

  private createStreamingIngestionPipelineFunction(): IFunction {
    const lambdaRootPath = __dirname + '/../lambdas/custom-resource';
    const fn = new SolutionNodejsFunction(this, 'CreateStreamingIngestionPipelineFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        lambdaRootPath,
        'create-streaming-ingestion-pipeline.ts',
      ),
      handler: 'handler',
      memorySize: 512,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'CreateStreamingIngestionPipelineRole', false, []),
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });
    return fn;
  }
}

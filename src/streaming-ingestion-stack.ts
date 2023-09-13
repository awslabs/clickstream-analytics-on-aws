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
  CfnCondition,
  CfnStack,
  Fn,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { REDSHIFT_MODE } from './common/model';
import { SolutionInfo } from './common/solution-info';
import {
  createStackParameters,
} from './streaming-ingestion/parameter';
import { StreamingIngestionPipelineNestedStack, createPipelineKinesisOnDemandRedshiftProvisionedNestStack, createPipelineKinesisOnDemandRedshiftServerlessNestStack, createPipelineKinesisProvisionedRedshiftProvisionedNestStack, createPipelineKinesisProvisionedRedshiftServerlessNestStack } from './streaming-ingestion/streaming-ingestion-pipeline-stack';
import { StreamingIngestionRedshiftStack } from './streaming-ingestion/streaming-ingestion-redshift-stack';

export class StreamingIngestionMainStack extends Stack {
  public readonly kinesisOnDemandStack?: StreamingIngestionPipelineNestedStack;
  public readonly kinesisProvisionedStack?: StreamingIngestionPipelineNestedStack;
  public readonly redshiftServerlessStack?: StreamingIngestionRedshiftStack;
  public readonly redshiftProvisionedStack?: StreamingIngestionRedshiftStack;

  constructor(
    scope: Construct,
    id: string,
    props?: StackProps,
  ) {
    super(scope, id, props);

    const featureName = 'StreamingIngestion';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-si) ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const p = createStackParameters(this);
    this.templateOptions.metadata = p.metadata;

    const streamModeStr = p.params.kinesis.mode;
    const redshiftModeStr = p.params.redshift.mode;

    const kinesisOnDemandRedshiftServerlessStackCondition = new CfnCondition(
      this,
      'kinesisOnDemandRedshiftServerlessStackCondition',
      {
        expression:
          Fn.conditionAnd(
            Fn.conditionEquals(streamModeStr, 'ON_DEMAND'),
            Fn.conditionEquals(redshiftModeStr, REDSHIFT_MODE.SERVERLESS),
          ),
      },
    );

    const kinesisProvisionedRedshiftServerlessStackCondition = new CfnCondition(
      this,
      'kinesisProvisionedRedshiftServerlessStackCondition',
      {
        expression:
          Fn.conditionAnd(
            Fn.conditionEquals(streamModeStr, 'PROVISIONED'),
            Fn.conditionEquals(redshiftModeStr, REDSHIFT_MODE.SERVERLESS),
          ),
      },
    );

    const kinesisOnDemandRedshiftProvisionedStackCondition = new CfnCondition(
      this,
      'kinesisOnDemandRedshiftProvisionedStackCondition',
      {
        expression:
          Fn.conditionAnd(
            Fn.conditionEquals(streamModeStr, 'ON_DEMAND'),
            Fn.conditionEquals(redshiftModeStr, REDSHIFT_MODE.PROVISIONED),
          ),
      },
    );

    const kinesisProvisionedRedshiftProvisionedStackCondition = new CfnCondition(
      this,
      'kinesisProvisionedRedshiftProvisionedStackCondition',
      {
        expression:
          Fn.conditionAnd(
            Fn.conditionEquals(streamModeStr, 'PROVISIONED'),
            Fn.conditionEquals(redshiftModeStr, REDSHIFT_MODE.PROVISIONED),
          ),
      },
    );

    const stackProps = {
      projectId: p.params.projectId,
      appIds: p.params.appIds,
      kinesis: {
        kinesisStreamMode: p.params.kinesis.mode,
        kinesisDataRetentionHours: p.params.kinesis.dataRetentionHours,
        kinesisShardCount: p.params.kinesis.shardCount,
      },
      pipeline: p.params.pipeline,
      streamingIngestionConfiguration: {
        streamingIngestionRoleArn: p.params.streamingIngestionConfiguration.streamingIngestionRoleArn,
      },
      redshift: p.params.redshift,
    };

    const kinesisOnDemandRedshiftServerlessNestStack = createPipelineKinesisOnDemandRedshiftServerlessNestStack(this, stackProps);
    (kinesisOnDemandRedshiftServerlessNestStack.kinesisOnDemandStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisOnDemandRedshiftServerlessStackCondition;
    (kinesisOnDemandRedshiftServerlessNestStack.redshiftServerlessStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisOnDemandRedshiftServerlessStackCondition;
    this.kinesisOnDemandStack = kinesisOnDemandRedshiftServerlessNestStack.kinesisOnDemandStack;
    this.redshiftServerlessStack = kinesisOnDemandRedshiftServerlessNestStack.redshiftServerlessStack;

    const kinesisOnDemandRedshiftProvisionedNestStack = createPipelineKinesisOnDemandRedshiftProvisionedNestStack(this, stackProps);
    (kinesisOnDemandRedshiftProvisionedNestStack.kinesisOnDemandStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisOnDemandRedshiftProvisionedStackCondition;
    (kinesisOnDemandRedshiftProvisionedNestStack.redshiftProvisionedStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisOnDemandRedshiftProvisionedStackCondition;
    if (kinesisOnDemandRedshiftProvisionedNestStack.kinesisOnDemandStack) {
      this.kinesisOnDemandStack = kinesisOnDemandRedshiftProvisionedNestStack.kinesisOnDemandStack;
    }
    if (kinesisOnDemandRedshiftProvisionedNestStack.redshiftProvisionedStack) {
      this.redshiftProvisionedStack = kinesisOnDemandRedshiftProvisionedNestStack.redshiftProvisionedStack;
    }

    const kinesisProvisionedRedshiftServerlessNestStack = createPipelineKinesisProvisionedRedshiftServerlessNestStack(this, stackProps);
    (kinesisProvisionedRedshiftServerlessNestStack.kinesisProvisionedStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisProvisionedRedshiftServerlessStackCondition;
    (kinesisProvisionedRedshiftServerlessNestStack.redshiftServerlessStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisProvisionedRedshiftServerlessStackCondition;
    if (kinesisProvisionedRedshiftServerlessNestStack.kinesisProvisionedStack) {
      this.kinesisProvisionedStack = kinesisProvisionedRedshiftServerlessNestStack.kinesisProvisionedStack;
    }
    if (kinesisProvisionedRedshiftServerlessNestStack.redshiftServerlessStack) {
      this.redshiftServerlessStack = kinesisProvisionedRedshiftServerlessNestStack.redshiftServerlessStack;
    }

    const kinesisProvisionedRedshiftProvisionedNestStack = createPipelineKinesisProvisionedRedshiftProvisionedNestStack(this, stackProps);
    (kinesisProvisionedRedshiftProvisionedNestStack.kinesisProvisionedStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisProvisionedRedshiftProvisionedStackCondition;
    (kinesisProvisionedRedshiftProvisionedNestStack.redshiftProvisionedStack.nestedStackResource as CfnStack).cfnOptions.condition =
      kinesisProvisionedRedshiftProvisionedStackCondition;
    if (kinesisProvisionedRedshiftProvisionedNestStack.kinesisProvisionedStack) {
      this.kinesisProvisionedStack = kinesisProvisionedRedshiftProvisionedNestStack.kinesisProvisionedStack;
    }
    if (kinesisProvisionedRedshiftProvisionedNestStack.redshiftProvisionedStack) {
      this.redshiftProvisionedStack = kinesisProvisionedRedshiftProvisionedNestStack.redshiftProvisionedStack;
    }

  }
}
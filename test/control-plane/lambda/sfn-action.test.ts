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
  CloudFormationClient,
  DescribeStacksCommand, StackStatus, UpdateTerminationProtectionCommand,
} from '@aws-sdk/client-cloudformation';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, SfnStackEvent, StackAction } from '../../../src/control-plane/backend/lambda/sfn-action/index';
import { getMockContext } from '../../common/lambda-context';
import 'aws-sdk-client-mock-jest';

describe('SFN Action Lambda Function', () => {

  const context = getMockContext();
  const s3Mock = mockClient(S3Client);
  const cloudFormationMock = mockClient(CloudFormationClient);

  const baseStackActionEvent = {
    Action: 'Create',
    Input: {
      Region: 'ap-southeast-1',
      TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/feature-rel/main/default/data-pipeline-stack.template.json',
      Parameters: [],
      StackName: 'Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf',
      Tags: [],
    },
    Callback: {
      BucketPrefix: 'clickstream/workflow/main-6ba79aa7-b9ef-40dd-aed9-701bebb61eb4',
      BucketName: 'cloudfront-s3-control-pl-solutionbucketlogbucket3-t64p6bbwz53m',
    },
  };

  const stackResult = {
    StackId: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
    StackName: 'Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf',
    Description: '(SO0219) Clickstream Analytics on AWS - DataPipeline (Version v0.5.1-main-202305111513-852d242c)',
    Parameters: [],
    CreationTime: new Date(),
    DeletionTime: new Date(),
    RollbackConfiguration: {},
    StackStatus: StackStatus.DELETE_IN_PROGRESS,
    DisableRollback: true,
    NotificationARNs: [],
    Capabilities: [
      'CAPABILITY_IAM',
      'CAPABILITY_NAMED_IAM',
      'CAPABILITY_AUTO_EXPAND',
    ],
    Tags: [],
    EnableTerminationProtection: false,
    DriftInformation: {
      StackDriftStatus: 'NOT_CHECKED',
    },
  };

  beforeEach(() => {
    s3Mock.reset();
    cloudFormationMock.reset();
  });

  test('Describe stack with delete_in_progress', async () => {
    const event: SfnStackEvent = {
      ...baseStackActionEvent,
      Action: StackAction.DESCRIBE,
      Result: {
        ...stackResult,
        StackStatus: StackStatus.DELETE_IN_PROGRESS,
      },
    };
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          ...stackResult,
          StackStatus: StackStatus.DELETE_COMPLETE,
        },
      ],
    });
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      ...event,
      Action: StackAction.CALLBACK,
      Result: {
        ...stackResult,
        StackStatus: StackStatus.DELETE_COMPLETE,
      },
    });
    expect(cloudFormationMock).toHaveReceivedNthSpecificCommandWith(1, DescribeStacksCommand, {
      StackName: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
    });
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  test('Describe stack with delete_complete', async () => {
    const event: SfnStackEvent = {
      ...baseStackActionEvent,
      Action: StackAction.DESCRIBE,
      Result: {
        ...stackResult,
        StackStatus: StackStatus.DELETE_COMPLETE,
      },
    };
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          ...stackResult,
          StackStatus: StackStatus.DELETE_COMPLETE,
        },
      ],
    });
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      ...event,
      Action: StackAction.CALLBACK,
      Result: {
        ...stackResult,
        StackStatus: StackStatus.DELETE_COMPLETE,
      },
    });
    expect(cloudFormationMock).toHaveReceivedNthSpecificCommandWith(1, DescribeStacksCommand, {
      StackName: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
    });
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  test('Delete stack with protection', async () => {
    const event: SfnStackEvent = {
      ...baseStackActionEvent,
      Action: StackAction.DELETE,
      Result: {
        ...stackResult,
        StackStatus: StackStatus.CREATE_COMPLETE,
      },
    };
    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          ...stackResult,
          StackStatus: StackStatus.CREATE_COMPLETE,
        },
      ],
    });
    cloudFormationMock.on(UpdateTerminationProtectionCommand).resolves({
      StackId: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
    });
    const resp = await handler(event, context) as CdkCustomResourceResponse;
    expect(resp.Action).toEqual(StackAction.DESCRIBE);
    expect(resp.Result.StackId).toEqual('arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60');
    expect(resp.Result.StackName).toEqual('Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf');
    expect(resp.Result.StackStatus).toEqual(StackStatus.DELETE_IN_PROGRESS);
    expect(cloudFormationMock).toHaveReceivedNthSpecificCommandWith(1, DescribeStacksCommand, {
      StackName: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
    });
    expect(cloudFormationMock).toHaveReceivedNthSpecificCommandWith(1, UpdateTerminationProtectionCommand, {
      EnableTerminationProtection: false,
      StackName: 'arn:aws:cloudformation:ap-southeast-1:555555555555:stack/Clickstream-ETL-6972c135cb864885b25c5b7ebe584fdf/5b6971e0-f261-11ed-a7e3-02a848659f60',
    });
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });
});

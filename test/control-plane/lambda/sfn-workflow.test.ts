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

import { Readable } from 'stream';
import {
  CloudFormationClient,
  DescribeStacksCommand,
  StackStatus,
} from '@aws-sdk/client-cloudformation';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream-node';
import { CdkCustomResourceResponse } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, WorkFlowStack } from '../../../src/control-plane/backend/lambda/sfn-workflow/index';
import 'aws-sdk-client-mock-jest';

describe('SFN workflow Lambda Function', () => {

  const s3Mock = mockClient(S3Client);
  const cloudFormationMock = mockClient(CloudFormationClient);

  const baseStackWorkflowEvent: WorkFlowStack = {
    Type: 'Stack',
    Data: {
      Input: {
        Action: 'Create',
        Region: 'ap-northeast-1',
        StackName: 'Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa',
        TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.1.0-dev-main-202309261209-a1094814/default/data-pipeline-stack.template.json',
        Parameters: [
          {
            ParameterKey: 'VpcId',
            ParameterValue: 'vpc-099adfb13a6ba6821',
          },
          {
            ParameterKey: 'PrivateSubnetIds',
            ParameterValue: 'subnet-02b1c74d310e29d66,subnet-0f4d44b0cb5898403,subnet-02b77ab42fb6f6210',
          },
          {
            ParameterKey: 'ProjectId',
            ParameterValue: 'demo_ervv',
          },
          {
            ParameterKey: 'AppIds',
            ParameterValue: '',
          },
        ],
      },
      Callback: {
        BucketName: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
        BucketPrefix: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb',
      },
    },
    Name: 'DataProcessing',
  };

  const baseMapInput = {
    MapRun: true,
    Token: 'TOKEN',
    Data: {
      ...baseStackWorkflowEvent,
    },
  };

  beforeEach(() => {
    s3Mock.reset();
    cloudFormationMock.reset();
  });

  test('Create stack', async () => {
    const event: WorkFlowStack = {
      ...baseStackWorkflowEvent,
    };
    const resp = await handler(event) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      Data: {
        Callback: {
          BucketName: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
          BucketPrefix: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb',
        },
        Input: {
          Action: 'Create',
          Parameters: [
            { ParameterKey: 'VpcId', ParameterValue: 'vpc-099adfb13a6ba6821' },
            { ParameterKey: 'PrivateSubnetIds', ParameterValue: 'subnet-02b1c74d310e29d66,subnet-0f4d44b0cb5898403,subnet-02b77ab42fb6f6210' },
            { ParameterKey: 'ProjectId', ParameterValue: 'demo_ervv' },
            { ParameterKey: 'AppIds', ParameterValue: '' },
          ],
          Region: 'ap-northeast-1',
          StackName: 'Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa',
          TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.1.0-dev-main-202309261209-a1094814/default/data-pipeline-stack.template.json',
        },
      },
      Name: 'DataProcessing',
      Type: 'Stack',
    });
    expect(s3Mock).toHaveReceivedCommandTimes(GetObjectCommand, 0);
  });

  test('Create stack with parameter get from JSONPath', async () => {
    const event: WorkFlowStack = {
      ...baseStackWorkflowEvent,
      Data: {
        ...baseStackWorkflowEvent.Data,
        Input: {
          ...baseStackWorkflowEvent.Data.Input,
          Parameters: [
            ...baseStackWorkflowEvent.Data.Input.Parameters,
            {
              ParameterKey: 'RedshiftEndpointParam.$',
              ParameterValue: '$.Clickstream-DataModelingRedshift-f00b00bdbabb4ea9a00e8e66f0f372fa.Outputs[0].OutputValue',
            },
          ],
        },
      },
    };
    const obj = {
      'Clickstream-DataModelingRedshift-f00b00bdbabb4ea9a00e8e66f0f372fa': {
        Outputs: [{
          OutputKey: 'StackCreatedRedshiftServerlessWorkgroupEndpointAddress',
          OutputValue: 'redshift-serverless-workgroup-endpoint-address',
        }],
      },
    };

    const stream = new Readable();
    stream.push(JSON.stringify(obj));
    stream.push(null);
    // wrap the Stream with SDK mixin
    const sdkStream = sdkStreamMixin(stream);

    s3Mock.on(GetObjectCommand).resolves(
      {
        Body: sdkStream,
      },
    );
    const resp = await handler(event) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      Data: {
        Callback: {
          BucketName: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
          BucketPrefix: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb',
        },
        Input: {
          Action: 'Create',
          Parameters: [
            { ParameterKey: 'VpcId', ParameterValue: 'vpc-099adfb13a6ba6821' },
            { ParameterKey: 'PrivateSubnetIds', ParameterValue: 'subnet-02b1c74d310e29d66,subnet-0f4d44b0cb5898403,subnet-02b77ab42fb6f6210' },
            { ParameterKey: 'ProjectId', ParameterValue: 'demo_ervv' },
            { ParameterKey: 'AppIds', ParameterValue: '' },
            { ParameterKey: 'RedshiftEndpointParam', ParameterValue: 'redshift-serverless-workgroup-endpoint-address' },
          ],
          Region: 'ap-northeast-1',
          StackName: 'Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa',
          TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.1.0-dev-main-202309261209-a1094814/default/data-pipeline-stack.template.json',
        },
      },
      Name: 'DataProcessing',
      Type: 'Stack',
    });
    expect(s3Mock).toHaveReceivedNthSpecificCommandWith(1, GetObjectCommand, {
      Bucket: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
      Key: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb/Clickstream-DataModelingRedshift-f00b00bdbabb4ea9a00e8e66f0f372fa/output.json',
    });
  });

  test('Create stack with parameter get from stack output suffix', async () => {
    const event: WorkFlowStack = {
      ...baseStackWorkflowEvent,
      Data: {
        ...baseStackWorkflowEvent.Data,
        Input: {
          ...baseStackWorkflowEvent.Data.Input,
          Parameters: [
            ...baseStackWorkflowEvent.Data.Input.Parameters,
            {
              ParameterKey: 'RedshiftEndpointParam.#',
              ParameterValue: '#.Clickstream-DataModelingRedshift-f00b00bdbabb4ea9a00e8e66f0f372fa.StackCreatedRedshiftServerlessWorkgroupEndpointAddress',
            },
          ],
        },
      },
    };
    const obj = {
      'Clickstream-DataModelingRedshift-f00b00bdbabb4ea9a00e8e66f0f372fa': {
        Outputs: [{
          OutputKey: 'xxxx-StackCreatedRedshiftServerlessWorkgroupEndpointAddress',
          OutputValue: 'redshift-serverless-workgroup-endpoint-address',
        }],
      },
    };

    const stream = new Readable();
    stream.push(JSON.stringify(obj));
    stream.push(null);
    // wrap the Stream with SDK mixin
    const sdkStream = sdkStreamMixin(stream);

    s3Mock.on(GetObjectCommand).resolves(
      {
        Body: sdkStream,
      },
    );
    const resp = await handler(event) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      Data: {
        Callback: {
          BucketName: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
          BucketPrefix: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb',
        },
        Input: {
          Action: 'Create',
          Parameters: [
            { ParameterKey: 'VpcId', ParameterValue: 'vpc-099adfb13a6ba6821' },
            { ParameterKey: 'PrivateSubnetIds', ParameterValue: 'subnet-02b1c74d310e29d66,subnet-0f4d44b0cb5898403,subnet-02b77ab42fb6f6210' },
            { ParameterKey: 'ProjectId', ParameterValue: 'demo_ervv' },
            { ParameterKey: 'AppIds', ParameterValue: '' },
            { ParameterKey: 'RedshiftEndpointParam', ParameterValue: 'redshift-serverless-workgroup-endpoint-address' },
          ],
          Region: 'ap-northeast-1',
          StackName: 'Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa',
          TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.1.0-dev-main-202309261209-a1094814/default/data-pipeline-stack.template.json',
        },
      },
      Name: 'DataProcessing',
      Type: 'Stack',
    });
    expect(s3Mock).toHaveReceivedNthSpecificCommandWith(1, GetObjectCommand, {
      Bucket: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
      Key: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb/Clickstream-DataModelingRedshift-f00b00bdbabb4ea9a00e8e66f0f372fa/output.json',
    });
  });

  test('Pass stack', async () => {
    const event: WorkFlowStack = {
      ...baseStackWorkflowEvent,
      Type: 'Pass',
    };

    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: [
            {
              OutputKey: 'ObservabilityDashboardName',
              OutputValue: 'clickstream_dashboard_notepad_mtzfsocy',
            },
          ],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    s3Mock.on(PutObjectCommand).resolves({});
    const resp = await handler(event) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      Data: {
        Callback: {
          BucketName: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
          BucketPrefix: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb',
        },
        Input: {
          Action: 'Create',
          Parameters: [
            { ParameterKey: 'VpcId', ParameterValue: 'vpc-099adfb13a6ba6821' },
            { ParameterKey: 'PrivateSubnetIds', ParameterValue: 'subnet-02b1c74d310e29d66,subnet-0f4d44b0cb5898403,subnet-02b77ab42fb6f6210' },
            { ParameterKey: 'ProjectId', ParameterValue: 'demo_ervv' },
            { ParameterKey: 'AppIds', ParameterValue: '' },
          ],
          Region: 'ap-northeast-1',
          StackName: 'Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa',
          TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.1.0-dev-main-202309261209-a1094814/default/data-pipeline-stack.template.json',
        },
      },
      Name: 'DataProcessing',
      Type: 'Pass',
    });
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
  });

  test('Run pass stack in map', async () => {
    const event = {
      ...baseMapInput,
      Data: {
        ...baseStackWorkflowEvent,
        Type: 'Pass',
      },
    };

    cloudFormationMock.on(DescribeStacksCommand).resolves({
      Stacks: [
        {
          StackName: 'xxx',
          Outputs: [
            {
              OutputKey: 'ObservabilityDashboardName',
              OutputValue: 'clickstream_dashboard_notepad_mtzfsocy',
            },
          ],
          StackStatus: StackStatus.CREATE_COMPLETE,
          CreationTime: new Date(),
        },
      ],
    });
    const resp = await handler(event) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      Data: {
        Callback: {
          BucketName: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
          BucketPrefix: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb',
        },
        Input: {
          Action: 'Create',
          Parameters: [
            { ParameterKey: 'VpcId', ParameterValue: 'vpc-099adfb13a6ba6821' },
            { ParameterKey: 'PrivateSubnetIds', ParameterValue: 'subnet-02b1c74d310e29d66,subnet-0f4d44b0cb5898403,subnet-02b77ab42fb6f6210' },
            { ParameterKey: 'ProjectId', ParameterValue: 'demo_ervv' },
            { ParameterKey: 'AppIds', ParameterValue: '' },
          ],
          Region: 'ap-northeast-1',
          StackName: 'Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa',
          TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.1.0-dev-main-202309261209-a1094814/default/data-pipeline-stack.template.json',
        },
      },
      Name: 'DataProcessing',
      Type: 'Pass',
    });
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
  });

  test('Run pass stack in map and stack has been deleted', async () => {
    const event = {
      ...baseMapInput,
      Data: {
        ...baseStackWorkflowEvent,
        Type: 'Pass',
      },
    };

    cloudFormationMock.on(DescribeStacksCommand).rejects(
      new Error('Stack not found'),
    );
    const resp = await handler(event) as CdkCustomResourceResponse;
    expect(resp).toEqual({
      Data: {
        Callback: {
          BucketName: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
          BucketPrefix: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb',
        },
        Input: {
          Action: 'Create',
          Parameters: [
            { ParameterKey: 'VpcId', ParameterValue: 'vpc-099adfb13a6ba6821' },
            { ParameterKey: 'PrivateSubnetIds', ParameterValue: 'subnet-02b1c74d310e29d66,subnet-0f4d44b0cb5898403,subnet-02b77ab42fb6f6210' },
            { ParameterKey: 'ProjectId', ParameterValue: 'demo_ervv' },
            { ParameterKey: 'AppIds', ParameterValue: '' },
          ],
          Region: 'ap-northeast-1',
          StackName: 'Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa',
          TemplateURL: 'https://aws-gcr-solutions.s3.us-east-1.amazonaws.com/clickstream-branch-main/v1.1.0-dev-main-202309261209-a1094814/default/data-pipeline-stack.template.json',
        },
      },
      Name: 'DataProcessing',
      Type: 'Pass',
    });
    expect(s3Mock).toHaveReceivedNthSpecificCommandWith(1, PutObjectCommand, {
      Body: '{"Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa":{}}',
      Bucket: 'click-stream-control-pla-clickstreamsolutiondatab-tn5qj1l1w3e',
      Key: 'clickstream/workflow/main-d1f8f94d-09ae-4b08-9758-98d21b84c2bb/Clickstream-DataProcessing-f00b00bdbabb4ea9a00e8e66f0f372fa/output.json',
    });
  });

});

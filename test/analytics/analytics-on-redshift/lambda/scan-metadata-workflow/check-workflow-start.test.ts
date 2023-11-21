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
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SFNClient, ListExecutionsCommand } from '@aws-sdk/client-sfn';
import { sdkStreamMixin } from '@smithy/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, CheckMetadataWorkflowEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/check-metadata-workflow-start';
import { WorkflowStatus } from '../../../../../src/analytics/private/constant';
import 'aws-sdk-client-mock-jest';

const checkMetadataWorkflowEvent: CheckMetadataWorkflowEvent = {
  originalInput: {
    eventSource: 'LoadDataFlow',
    scanStartDate: '2023-10-10',
    scanEndDate: '2023-10-20',
  },
  executionId: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
};

describe('Lambda - check workflow start', () => {
  const s3ClientMock = mockClient(S3Client);

  const snfClientMock = mockClient(SFNClient);

  beforeEach(() => {
    s3ClientMock.reset();
  });

  test('workflow is triggered from upstream step function and first time', async () => {
    jest.useFakeTimers().setSystemTime(new Date(1698330523913));
    const emrObj = { endTimestamp: 1698330523913 };
    const emrObjStream = new Readable();
    emrObjStream.push(JSON.stringify(emrObj));
    emrObjStream.push(null);
    // wrap the Stream with SDK mixin
    const emrObjSdkStream = sdkStreamMixin(emrObjStream);

    s3ClientMock.on(GetObjectCommand)
      .resolvesOnce(
        {
          Body: emrObjSdkStream,
        },
      )
      .resolvesOnce({},
      );

    snfClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
        },
      ],
    });    

    const resp = await handler(checkMetadataWorkflowEvent);
    expect(resp).toEqual({
      status: WorkflowStatus.CONTINUE,
      scanEndDate: '2023-10-26',
      jobStartTimestamp: 1698330523913,
      scanStartDate: '',
    });
  });

  test('workflow is not triggered because it is too close to last triggered', async () => {
    jest.useFakeTimers().setSystemTime(new Date(1698330523913));

    const emrObj = { endTimestamp: 1698330523913 };
    const emrObjStream = new Readable();
    emrObjStream.push(JSON.stringify(emrObj));
    emrObjStream.push(null);
    // wrap the Stream with SDK mixin
    const emrObjSdkStream = sdkStreamMixin(emrObjStream);

    const workflowObj = {
      lastJobStartTimestamp: 1698330523913,
      lastScanEndDate: '2023-10-26',
    };
    const workflowObjStream = new Readable();
    workflowObjStream.push(JSON.stringify(workflowObj));
    workflowObjStream.push(null);
    // wrap the Stream with SDK mixin
    const workflowObjSdkStream = sdkStreamMixin(workflowObjStream);

    s3ClientMock.on(GetObjectCommand)
      .resolvesOnce(
        {
          Body: emrObjSdkStream,
        },
      )
      .resolvesOnce(
        {
          Body: workflowObjSdkStream,
        },
      );

    snfClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
        },
      ],
    });        

    const resp = await handler(checkMetadataWorkflowEvent);
    expect(resp).toEqual({
      status: WorkflowStatus.SKIP,
    });
  });

  test('workflow is triggered from upstream step function and not first time', async () => {
    jest.useFakeTimers().setSystemTime(new Date(1698416923914));

    const emrObj = { endTimestamp: 1698416923914 };
    const emrObjStream = new Readable();
    emrObjStream.push(JSON.stringify(emrObj));
    emrObjStream.push(null);
    // wrap the Stream with SDK mixin
    const emrObjSdkStream = sdkStreamMixin(emrObjStream);

    const workflowObj = {
      lastJobStartTimestamp: 1698330523913,
      lastScanEndDate: '2023-10-24',
    };
    const workflowObjStream = new Readable();
    workflowObjStream.push(JSON.stringify(workflowObj));
    workflowObjStream.push(null);
    // wrap the Stream with SDK mixin
    const workflowObjSdkStream = sdkStreamMixin(workflowObjStream);

    s3ClientMock.on(GetObjectCommand)
      .resolvesOnce(
        {
          Body: emrObjSdkStream,
        },
      )
      .resolvesOnce(
        {
          Body: workflowObjSdkStream,
        },
      );

    snfClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
        },
      ],
    });       

    const resp = await handler(checkMetadataWorkflowEvent);
    expect(resp).toEqual({
      status: WorkflowStatus.CONTINUE,
      scanEndDate: '2023-10-27',
      jobStartTimestamp: 1698416923914,
      scanStartDate: '2023-10-24',
    });
  });

  test('workflow is triggered manually with input', async () => {
    jest.useFakeTimers().setSystemTime(new Date(1698416923914));
    checkMetadataWorkflowEvent.originalInput.eventSource = '';
    snfClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
        },
      ],
    });  

    const resp = await handler(checkMetadataWorkflowEvent);
    expect(resp).toEqual({
      status: WorkflowStatus.CONTINUE,
      scanEndDate: '2023-10-20',
      jobStartTimestamp: 1698416923914,
      scanStartDate: '2023-10-10',
    });
  });

  test('workflow is triggered manually, without input content', async () => {
    jest.useFakeTimers().setSystemTime(new Date(1698416923914));
    checkMetadataWorkflowEvent.originalInput.eventSource = '';
    checkMetadataWorkflowEvent.originalInput.scanEndDate = '';
    checkMetadataWorkflowEvent.originalInput.scanStartDate = '';
    snfClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
        },
      ],
    });    
    const resp = await handler(checkMetadataWorkflowEvent);
    expect(resp).toEqual({
      status: WorkflowStatus.CONTINUE,
      scanEndDate: '2023-10-27',
      jobStartTimestamp: 1698416923914,
      scanStartDate: '',
    });
  });

  test('workflow is triggered manually, with invalid input content', async () => {
    jest.useFakeTimers().setSystemTime(new Date(1698416923914));
    checkMetadataWorkflowEvent.originalInput.eventSource = '';
    checkMetadataWorkflowEvent.originalInput.scanEndDate = '2023-10-271';
    checkMetadataWorkflowEvent.originalInput.scanStartDate = 'addd';
    snfClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
        },
      ],
    });     
    await expect(handler(checkMetadataWorkflowEvent)).rejects.toThrow('input scan date format is not yyyy-mm-dd');
  });

  test('workflow is skipped due to another workflow is running', async () => {
    jest.useFakeTimers().setSystemTime(new Date(1698416923914));
    snfClientMock.on(ListExecutionsCommand).resolves({
      executions: [
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_1',
        },
        //@ts-ignore
        {
          executionArn: 'arn:aws:states:us-east-1:xxxxxxxxx:execution:stateMachineNameTest:exec_id_2',
        },        
      ],
    });     
    const resp = await handler(checkMetadataWorkflowEvent);
    expect(resp).toEqual({
      status: WorkflowStatus.SKIP,
    });   
  });  
});
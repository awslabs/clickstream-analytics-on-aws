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
import { sdkStreamMixin } from '@smithy/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';
import { handler, CheckMetadataWorkflowEvent } from '../../../../../src/analytics/lambdas/scan-metadata-workflow/check-metadata-workflow-start';
import { WorkflowStatus } from '../../../../../src/analytics/private/constant';
import 'aws-sdk-client-mock-jest';

const checkMetadataWorkflowEvent: CheckMetadataWorkflowEvent = {
  eventSource: 'LoadDataFlow',
  scanStartDate: '2023-10-10',
  scanEndDate: '2023-10-20',
};

describe('Lambda - check workflow start', () => {
  const s3ClientMock = mockClient(S3Client);

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
    checkMetadataWorkflowEvent.eventSource = '';
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
    checkMetadataWorkflowEvent.eventSource = '';
    checkMetadataWorkflowEvent.scanEndDate = '';
    checkMetadataWorkflowEvent.scanStartDate = '';
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
    checkMetadataWorkflowEvent.eventSource = '';
    checkMetadataWorkflowEvent.scanEndDate = '2023-10-271';
    checkMetadataWorkflowEvent.scanStartDate = 'addd';
    await expect(handler(checkMetadataWorkflowEvent)).rejects.toThrow('input scan date format is not yyyy-mm-dd');
  });
});
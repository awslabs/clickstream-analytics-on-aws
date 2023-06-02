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

import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { paginateData } from '../../common/utils';
import { ClickStreamStore } from '../../store/click-stream-store';
import { DynamoDbStore } from '../../store/dynamodb/dynamodb-store';

const ddbMock = mockClient(DynamoDBDocumentClient);
const store: ClickStreamStore = new DynamoDbStore();

describe('App test', () => {

  beforeEach(() => {
    ddbMock.reset();
  });

  it('DDB GetCommand no item', async () => {
    ddbMock.on(GetCommand).resolves({});
    const getProject = await store.getProject('666');
    expect(getProject).toBe(undefined);
    const isProjectExisted = await store.isProjectExisted('666');
    expect(isProjectExisted).toBe(false);
    const getApplication = await store.getApplication('666', '666');
    expect(getApplication).toBe(undefined);
    const isApplicationExisted = await store.isApplicationExisted('666', '666');
    expect(isApplicationExisted).toBe(false);
    const getPipeline = await store.getPipeline('666', '666');
    expect(getPipeline).toBe(undefined);
    const isPipelineExisted = await store.isPipelineExisted('666', '666');
    expect(isPipelineExisted).toBe(false);
    const getDictionary = await store.getDictionary('666');
    expect(getDictionary).toBe(undefined);
  });

  it('DDB GetCommand with item deleted true', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { deleted: true } });
    const getProject = await store.getProject('666');
    expect(getProject).toBe(undefined);
    const isProjectExisted = await store.isProjectExisted('666');
    expect(isProjectExisted).toBe(false);
    const getApplication = await store.getApplication('666', '666');
    expect(getApplication).toBe(undefined);
    const isApplicationExisted = await store.isApplicationExisted('666', '666');
    expect(isApplicationExisted).toBe(false);
    const getPipeline = await store.getPipeline('666', '666');
    expect(getPipeline).toBe(undefined);
    const isPipelineExisted = await store.isPipelineExisted('666', '666');
    expect(isPipelineExisted).toBe(false);
  });

  it('DDB GetCommand with item deleted false', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { deleted: false } });
    const getProject = await store.getProject('666');
    expect(getProject).toEqual({ deleted: false });
    const isProjectExisted = await store.isProjectExisted('666');
    expect(isProjectExisted).toBe(true);
    const getApplication = await store.getApplication('666', '666');
    expect(getApplication).toEqual({ deleted: false });
    const isApplicationExisted = await store.isApplicationExisted('666', '666');
    expect(isApplicationExisted).toBe(true);
    const getPipeline = await store.getPipeline('666', '666');
    expect(getPipeline).toEqual({ deleted: false });
    const isPipelineExisted = await store.isPipelineExisted('666', '666');
    expect(isPipelineExisted).toBe(true);
  });

  it('DDB pagination', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [{ id: 1 }, { id: 2 }, { id: 3 }],
    });
    const listProjects = await store.listProjects('asc');
    expect(paginateData(listProjects, true, 1, 2)).toEqual([{ id: 2 }]);
    const listApplication = await store.listApplication('666', 'asc');
    expect(paginateData(listApplication, true, 1, 2)).toEqual([{ id: 2 }]);
    const listPipeline = await store.listPipeline('666', '', 'asc');
    expect(paginateData(listPipeline, true, 2, 1)).toEqual([{ id: 1 }, { id: 2 }]);

  });

});
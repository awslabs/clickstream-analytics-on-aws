import { GetCommand, GetCommandInput, PutCommand } from '@aws-sdk/lib-dynamodb';
import { clickStreamTableName } from '../../common/constants';

const MOCK_TOKEN = '0000-0000';
const MOCK_PROJECT_ID = '8888-8888';
const MOCK_APP_ID = '7777-7777';
const MOCK_PIPELINE_ID = '6666-6666';

function tokenMock(ddbMock: any, expect: boolean): any {
  if (!expect) {
    return ddbMock.on(PutCommand).resolvesOnce({});
  }
  const err = new Error('Mock Token error');
  err.name = 'ConditionalCheckFailedException';
  return ddbMock.on(PutCommand).rejects(err);
}

function projectExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      projectId: MOCK_PROJECT_ID,
      type: `METADATA#${MOCK_PROJECT_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      projectId: MOCK_PROJECT_ID,
      deleted: !existed,
    },
  });
}

function appExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      projectId: MOCK_PROJECT_ID,
      type: `APP#${MOCK_APP_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      projectId: MOCK_PROJECT_ID,
      appId: MOCK_PROJECT_ID,
      deleted: !existed,
    },
  });
}

function pipelineExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      projectId: MOCK_PROJECT_ID,
      type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      projectId: MOCK_PROJECT_ID,
      type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      pipelineId: MOCK_PIPELINE_ID,
      deleted: !existed,
    },
  });
}

export {
  MOCK_TOKEN,
  MOCK_PROJECT_ID,
  MOCK_APP_ID,
  MOCK_PIPELINE_ID,
  tokenMock,
  projectExistedMock,
  appExistedMock,
  pipelineExistedMock,
};
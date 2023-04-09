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

import { GetCommand, GetCommandInput, PutCommand } from '@aws-sdk/lib-dynamodb';
import { clickStreamTableName, dictionaryTableName } from '../../common/constants';

const MOCK_TOKEN = '0000-0000';
const MOCK_PROJECT_ID = '8888-8888';
const MOCK_APP_ID = '7777-7777';
const MOCK_PIPELINE_ID = '6666-6666';
const MOCK_PLUGIN_ID = '5555-5555';
const MOCK_EXECUTION_ID = '3333-3333';
const MOCK_BUILDIN_PLUGIN_ID = 'BUILDIN-1';

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
      id: MOCK_PROJECT_ID,
      type: `METADATA#${MOCK_PROJECT_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PROJECT_ID,
      deleted: !existed,
    },
  });
}

function appExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PROJECT_ID,
      type: `APP#${MOCK_APP_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PROJECT_ID,
      appId: MOCK_PROJECT_ID,
      deleted: !existed,
    },
  });
}

function pipelineExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PROJECT_ID,
      type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PROJECT_ID,
      type: `PIPELINE#${MOCK_PIPELINE_ID}#latest`,
      pipelineId: MOCK_PIPELINE_ID,
      deleted: !existed,
    },
  });
}

function pluginExistedMock(ddbMock: any, existed: boolean): any {
  const tokenInput: GetCommandInput = {
    TableName: clickStreamTableName,
    Key: {
      id: MOCK_PLUGIN_ID,
      type: `PLUGIN#${MOCK_PLUGIN_ID}`,
    },
  };
  return ddbMock.on(GetCommand, tokenInput).resolves({
    Item: {
      id: MOCK_PLUGIN_ID,
      type: `PLUGIN#${MOCK_PLUGIN_ID}`,
      deleted: !existed,
    },
  });
}

function dictionaryMock(ddbMock: any): any {
  ddbMock.on(GetCommand, {
    TableName: dictionaryTableName,
    Key: {
      name: 'BuildInPlugins',
    },
  }).resolves({
    Item: {
      name: 'BuildInPlugins',
      data: '[{"id":"BUILDIN-1","type":"PLUGIN#BUILDIN-1","prefix":"PLUGIN","name":"Transformer","description":"Description of Transformer","builtIn":true,"mainFunction":"sofeware.aws.solution.clickstream.Transformer","jarFile":"","bindCount":0,"pluginType":"Transform","dependencyFiles":[],"operator":"","deleted":false,"createAt":1000000000001,"updateAt":1000000000001},{"id":"BUILDIN-2","type":"PLUGIN#BUILDIN-2","prefix":"PLUGIN","name":"UAEnrichment","description":"Description of UAEnrichment","builtIn":true,"mainFunction":"sofeware.aws.solution.clickstream.UAEnrichment","jarFile":"","bindCount":0,"pluginType":"Enrich","dependencyFiles":[],"operator":"","deleted":false,"createAt":1000000000002,"updateAt":1000000000002},{"id":"BUILDIN-3","type":"PLUGIN#BUILDIN-3","prefix":"PLUGIN","name":"UAEnrichment","description":"Description of IPEnrichment","builtIn":true,"mainFunction":"sofeware.aws.solution.clickstream.IPEnrichment","jarFile":"","bindCount":0,"pluginType":"Enrich","dependencyFiles":[],"operator":"","deleted":false,"createAt":1000000000003,"updateAt":1000000000003}]',
    },
  });
  ddbMock.on(GetCommand, {
    TableName: dictionaryTableName,
    Key: {
      name: 'Templates',
    },
  }).resolves({
    Item: {
      name: 'Templates',
      data: '{"ingestion_s3": "ingestion-server-s3-stack.template.json","ingestion_kafka": "ingestion-server-kafka-stack.template.json","ingestion_kinesis": "ingestion-server-kinesis-stack.template.json","kafka-s3-sink": "kafka-s3-sink-stack.template.json","data-pipeline": "data-pipeline-stack.template.json","data-analytics": "data-analytics-redshift-stack.template.json"}',
    },
  });
  ddbMock.on(GetCommand, {
    TableName: dictionaryTableName,
    Key: {
      name: 'Solution',
    },
  }).resolves({
    Item: {
      name: 'Solution',
      data: '{"name": "clickstream-branch-main","dist_output_bucket": "EXAMPLE-BUCKET","prefix": "feature-rel/main/default"}',
    },
  });
}

export {
  MOCK_TOKEN,
  MOCK_PROJECT_ID,
  MOCK_APP_ID,
  MOCK_PIPELINE_ID,
  MOCK_PLUGIN_ID,
  MOCK_EXECUTION_ID,
  MOCK_BUILDIN_PLUGIN_ID,
  tokenMock,
  projectExistedMock,
  appExistedMock,
  pipelineExistedMock,
  pluginExistedMock,
  dictionaryMock,
};
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

//@ts-nocheck

const putStringToS3Mock = jest.fn(() => {});
const isObjectExistMock = jest.fn(() => true);

const mockS3Functions = {
  putStringToS3: putStringToS3Mock,
  isObjectExist: isObjectExistMock,
};

jest.mock('../../src/common/s3', () => {
  return mockS3Functions;
});


import {
  handler,
} from '../../src/data-pipeline/lambda/init-app-config';
import {
  getMockContext,
} from '../common/lambda-context';

import 'aws-sdk-client-mock-jest';

process.env.PROJECT_ID = 'test_proj_001';
process.env.APP_IDS = 'app1,app2';
process.env.PIPELINE_S3_BUCKET_NAME = 'test-pipe-line-bucket';
process.env.PIPELINE_S3_PREFIX = 'pipeline-prefix/';


describe('Data Process -- put init app config files', () => {

  const context = getMockContext();
  const isObjectExistFalseMock = jest.fn(() => false);

  beforeEach(() => {
    mockS3Functions.isObjectExist = isObjectExistFalseMock;
  });

  test('should put config files when files do not exist ', async () => {

    await handler({ RequestType: 'Create' }, context);

    expect(isObjectExistFalseMock.mock.calls.length).toEqual(4);
    expect(putStringToS3Mock.mock.calls[0][0]).toContain('b.hatena.ne.jp');
    expect(putStringToS3Mock.mock.calls[0][1]).toEqual('test-pipe-line-bucket');
    expect(putStringToS3Mock.mock.calls[0][2]).toEqual('pipeline-prefix/test_proj_001/rules/app1/traffic_source_category_rule_v1.json');

    expect(putStringToS3Mock.mock.calls[1][0]).toContain('__empty__');
    expect(putStringToS3Mock.mock.calls[1][2]).toEqual('pipeline-prefix/test_proj_001/rules/app1/traffic_source_channel_rule_v1.json');

    expect(putStringToS3Mock.mock.calls[2][2]).toEqual('pipeline-prefix/test_proj_001/rules/app2/traffic_source_category_rule_v1.json');
    expect(putStringToS3Mock.mock.calls[3][2]).toEqual('pipeline-prefix/test_proj_001/rules/app2/traffic_source_channel_rule_v1.json');

  });


  test('should put config files when files do not exist with PIPELINE_S3_PREFIX=clickstream/project_id', async () => {
    process.env.PIPELINE_S3_PREFIX = 'clickstream/test_proj_001/';

    await handler({ RequestType: 'Update' }, context);

    expect(isObjectExistFalseMock.mock.calls.length).toEqual(4);
    expect(putStringToS3Mock.mock.calls[0][0]).toContain('b.hatena.ne.jp');
    expect(putStringToS3Mock.mock.calls[0][1]).toEqual('test-pipe-line-bucket');
    expect(putStringToS3Mock.mock.calls[0][2]).toEqual('clickstream/test_proj_001/rules/app1/traffic_source_category_rule_v1.json');

    expect(putStringToS3Mock.mock.calls[1][0]).toContain('__empty__');
    expect(putStringToS3Mock.mock.calls[1][2]).toEqual('clickstream/test_proj_001/rules/app1/traffic_source_channel_rule_v1.json');

    expect(putStringToS3Mock.mock.calls[2][2]).toEqual('clickstream/test_proj_001/rules/app2/traffic_source_category_rule_v1.json');
    expect(putStringToS3Mock.mock.calls[3][2]).toEqual('clickstream/test_proj_001/rules/app2/traffic_source_channel_rule_v1.json');

    process.env.PIPELINE_S3_PREFIX = 'pipeline-prefix/';

  });

  test('should not put config files when request is delete ', async () => {

    await handler({ RequestType: 'Delete' }, context);

    expect(isObjectExistFalseMock.mock.calls.length).toEqual(0);
    expect(putStringToS3Mock.mock.calls.length).toEqual(0);
  });
});


describe('Data Process -- ignore putting init app config files when files exist', () => {

  const context = getMockContext();
  const isObjectExistTrueMock = jest.fn(() => true);

  beforeEach(() => {
    mockS3Functions.isObjectExist = isObjectExistTrueMock;
  });

  test('should not put config files when files exist ', async () => {

    await handler({ RequestType: 'Update' }, context);

    expect(isObjectExistTrueMock.mock.calls.length).toEqual(4);
    expect(putStringToS3Mock.mock.calls.length).toEqual(0);

  });
});
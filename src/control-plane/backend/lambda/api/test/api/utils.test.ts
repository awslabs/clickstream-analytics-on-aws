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

import { MOCK_APP_ID, MOCK_PROJECT_ID } from './ddb-mock';
import {
  MUTIL_APP_ID_PATTERN,
  DOMAIN_NAME_PATTERN,
  KAFKA_BROKERS_PATTERN,
  KAFKA_TOPIC_PATTERN,
  PROJECT_ID_PATTERN,
  SUBNETS_PATTERN,
  VPC_ID_PARRERN,
  POSITIVE_INTEGERS,
  MUTIL_EMAIL_PATTERN,
  S3_PATH_PLUGIN_JARS_PATTERN,
  S3_PATH_PLUGIN_FILES_PATTERN,
} from '../../common/constants-ln';
import { validatePattern } from '../../common/stack-params-valid';
import { ClickStreamBadRequestError } from '../../common/types';
import { isEmpty } from '../../common/utils';

describe('Utils test', () => {

  it('Empty function', async () => {
    // String
    expect(isEmpty('')).toEqual(true);
    expect(isEmpty('x')).toEqual(false);
    expect(isEmpty('null')).toEqual(true);
    expect(isEmpty('undefined')).toEqual(true);

    // undefined and null
    expect(isEmpty(undefined)).toEqual(true);
    expect(isEmpty(null)).toEqual(true);

    // array and object
    expect(isEmpty([])).toEqual(true);
    expect(isEmpty([1])).toEqual(false);
    expect(isEmpty({})).toEqual(true);
    expect(isEmpty({ data: 1 })).toEqual(false);
  });

  it('Project Id valid', async () => {
    const validValues = [
      'proded4511',
      'pro_ded4511',
      MOCK_PROJECT_ID,
    ];
    validValues.map(v => expect(validatePattern('ProjectId', PROJECT_ID_PATTERN, v)).toEqual(true));
    const invalidValues = [
      'toooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooloooooooooooooooooooooooooooooooooooooooooooooooog',
      'abc.test',
      'pro_DGD_d4511_',
      'abc-test-01',
      'ABC',
      '',
      'ab$',
    ];
    invalidValues.map(v => expect(() => validatePattern('ProjectId', PROJECT_ID_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('App Id valid', async () => {
    const validValues = [
      'app_01',
      'a0d2619f249ded4511',
      'pro_DGD_d4511_',
      'app_01,app_02,app_03',
      MOCK_APP_ID,
      `${MOCK_APP_ID}_1,${MOCK_APP_ID}_2`,
    ];
    validValues.map(v => expect(validatePattern('AppId', MUTIL_APP_ID_PATTERN, v)).toEqual(true));
    const invalidValues = [
      'toooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooloooooooooooooooooooooooooooooooooooooooooooooooog',
      'abc.test',
      '0d2619f249ded4511',
      'app-01',
      '0d26-19f2-49ded4-511-01',
      'app_01,app_02,app-03',
      '',
      ',',
      ',abc',
      'abc,',
      'ab$',
    ];
    invalidValues.map(v => expect(() => validatePattern('AppId', MUTIL_APP_ID_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('VPC Params valid', async () => {
    // Vpc
    const validValues = [
      'vpc-0d2619f249ded4511',
      'vpc-012345678910abcde',
    ];
    validValues.map(v => expect(validatePattern('VpcId', VPC_ID_PARRERN, v)).toEqual(true));
    const invalidValues = [
      'vp-0d2619f249ded45111',
      'vpc0d2619f249ded45111',
      'vpc-0123456789abcdefg',
    ];
    invalidValues.map(v => expect(() => validatePattern('VpcId', VPC_ID_PARRERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Subnets Params valid', async () => {
    const validValues = [
      'subnet-a1234,subnet-b1234',
      'subnet-fffff1,subnet-fffff2,subnet-fffff3',
    ];

    validValues.map(v => expect(validatePattern('SubnetIds', SUBNETS_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'subnet-a1234',
      'net-a1234,net-b1234',
      'subnet-g1234,subnet-g1234',
      'subnet-a1234, subnet-b1234',
    ];
    invalidValues.map(v => expect(() => validatePattern('SubnetIds', SUBNETS_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Domain Name valid', async () => {
    const validValues = [
      'fake.example.com',
      'example.com',
    ];

    validValues.map(v => expect(validatePattern('DomainName', DOMAIN_NAME_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'test',
      'net.',
    ];
    invalidValues.map(v => expect(() => validatePattern('DomainName', DOMAIN_NAME_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Kafka brokers Params valid', async () => {
    const validValues = [
      'b1.test.com:9092',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b-1.test.com:9092,b-2.test.com:9092,b-3.test.com:9092',
      'b1.test.com:9000',
      'b-1.test.com:5001,b-2.test.com:5001',
      '192.169.1.1:9092,192.169.1.2:9092,192.169.1.3:9092',
    ];
    validValues.map(v => expect(validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'a',
      'b1.test.com:abc',
      'b1.test.com',
      'b-1.test.com,b-2.test.com:9092',
      '192.169.1.1,192.169.1.2,192.169.1.3',
      '192.169.1.1',
      '192.169.1.1:9092,192.169.1.2',
    ];
    invalidValues.map(v => expect(() => validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Kafka topic Params valid', async () => {
    const validValues = [
      'test',
      'test-sfds124',
      'test_sfds124',
      'test.sfds124',
    ];
    validValues.map(v => expect(validatePattern('KafkaTopic', KAFKA_TOPIC_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'sss*ddf',
      'abc%',
      'a#',
      'a,b',
    ];
    invalidValues.map(v => expect(() => validatePattern('KafkaTopic', KAFKA_TOPIC_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Positive Integers valid', async () => {
    const validValues = [
      '1',
      '2',
      '11',
      '22',
      '99999999',
    ];
    validValues.map(v => expect(validatePattern('Number', POSITIVE_INTEGERS, v)).toEqual(true));
    const invalidValues = [
      'sfsdf',
      '0',
      '-1',
      '1.1',
      '1 ',
      '128¥',
    ];
    invalidValues.map(v => expect(() => validatePattern('Number', POSITIVE_INTEGERS, v)).toThrow(ClickStreamBadRequestError));
  });

  it('s3 path plugin jars valid', async () => {
    const validValues = [
      's3://some-bucket/spark-etl-0.1.0.jar',
      's3://some-bucket/spark-etl-0.1.0.jar,s3://some-bucket/spark-etl-0.1.0.jar',
    ];
    validValues.map(v => expect(validatePattern('Plugin Jars', S3_PATH_PLUGIN_JARS_PATTERN, v)).toEqual(true));
    const invalidValues = [
      's3://some-bucket(&%^/spark-etl-0.1.0.jar',
      'abc/abc.jar',
      's3://abc/abc.txt',
      ',',
    ];
    invalidValues.map(v => expect(() => validatePattern('Plugin Jars', S3_PATH_PLUGIN_JARS_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('s3 path plugin files valid', async () => {
    const validValues = [
      's3://abc/abc.txt',
      's3://abc/abc/test.txt',
      's3://abc/abc/test.txt,s3://abc/abc/test2.txt',
    ];
    validValues.map(v => expect(validatePattern('Plugin Files', S3_PATH_PLUGIN_FILES_PATTERN, v)).toEqual(true));
    const invalidValues = [
      'abc/abc.txt',
      's3://abc_abc/abc/test.txt',
      's3://Abc/abc/test.txt',
      ',',
      '',
    ];
    invalidValues.map(v => expect(() => validatePattern('Plugin Files', S3_PATH_PLUGIN_FILES_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Emails valid', async () => {
    const validValues = [
      'fake@example.com',
      'fake1@example.com,fake2@example.com',
    ];
    validValues.map(v => expect(validatePattern('Emails', MUTIL_EMAIL_PATTERN, v)).toEqual(true));
    const invalidValues = [
      'a.com',
      '@example.com',
      'fake@example.com,',
      '',
    ];
    invalidValues.map(v => expect(() => validatePattern('Emails', MUTIL_EMAIL_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

});
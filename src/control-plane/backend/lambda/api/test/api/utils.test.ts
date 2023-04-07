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

import { DOMAIN_NAME_PATTERN, KAFKA_BROKERS_PATTERN, KAFKA_TOPIC_PATTERN, SUBNETS_PATTERN, VPC_ID_PARRERN } from '../../common/constants-ln';
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

  it('VPC Params valid', async () => {
    // Vpc
    const validValues = [
      'vpc-0d2619f249ded4511',
      'vpc-012345678910abcde',
    ];
    validValues.map(v => expect(validatePattern(VPC_ID_PARRERN, v)).toEqual(true));
    const invalidValues = [
      'vp-0d2619f249ded45111',
      'vpc0d2619f249ded45111',
      'vpc-0123456789abcdefg',
    ];
    invalidValues.map(v => expect(() => validatePattern(VPC_ID_PARRERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Subnets Params valid', async () => {
    const validValues = [
      'subnet-a1234,subnet-b1234',
      'subnet-fffff1,subnet-fffff2,subnet-fffff3',
    ];

    validValues.map(v => expect(validatePattern(SUBNETS_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'subnet-a1234',
      'net-a1234,net-b1234',
      'subnet-g1234,subnet-g1234',
      'subnet-a1234, subnet-b1234',
    ];
    invalidValues.map(v => expect(() => validatePattern(SUBNETS_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Domain Name valid', async () => {
    const validValues = [
      'fake.example.com',
      'example.com',
    ];

    validValues.map(v => expect(validatePattern(DOMAIN_NAME_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'test',
      'net.',
    ];
    invalidValues.map(v => expect(() => validatePattern(DOMAIN_NAME_PATTERN, v)).toThrow(ClickStreamBadRequestError));
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
    validValues.map(v => expect(validatePattern(KAFKA_BROKERS_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'a',
      'b1.test.com:abc',
      'b1.test.com',
      'b-1.test.com,b-2.test.com:9092',
      '192.169.1.1,192.169.1.2,192.169.1.3',
      '192.169.1.1',
      '192.169.1.1:9092,192.169.1.2',
    ];
    invalidValues.map(v => expect(() => validatePattern(KAFKA_BROKERS_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

  it('Kafka topic Params valid', async () => {
    const validValues = [
      'test',
      'test-sfds124',
      'test_sfds124',
      'test.sfds124',
    ];
    validValues.map(v => expect(validatePattern(KAFKA_TOPIC_PATTERN, v)).toEqual(true));

    const invalidValues = [
      'sss*ddf',
      'abc%',
      'a#',
      'a,b',
    ];
    invalidValues.map(v => expect(() => validatePattern(KAFKA_TOPIC_PATTERN, v)).toThrow(ClickStreamBadRequestError));
  });

});
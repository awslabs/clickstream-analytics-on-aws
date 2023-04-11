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

import { ExecutionType } from '../const';
import {
  extractAccountIdFromArn,
  generateDataProcessingInterval,
  generateRedshiftInterval,
  generateStr,
  validateEmails,
  validateProjectId,
} from '../utils';

describe('generateStr', () => {
  it('generate 8 characters string', () => {
    const result = generateStr(8);
    expect(result.length).toBe(8);
  });

  it('generate 12 characters string', () => {
    const result = generateStr(12);
    expect(result.length).toBe(12);
  });
});

describe('validateEmails', () => {
  it('validate one correct email', () => {
    const result = validateEmails('email@example.com');
    expect(result).toBeTruthy();
  });

  it('validate one incorrect email', () => {
    const result = validateEmails('email#example.com');
    expect(result).not.toBeTruthy();
  });

  it('validate all email are valid', () => {
    const result = validateEmails('email@example.com, email2@example.com');
    expect(result).toBeTruthy();
  });

  it('validate contains one incorrect email', () => {
    const result = validateEmails('email@example.com, email#example.com');
    expect(result).not.toBeTruthy();
  });
});

describe('generateDataProcessingInterval', () => {
  describe('when type is ExecutionType.FIXED_RATE', () => {
    it('should return default value when fixedValue is 0', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.FIXED_RATE,
        0,
        '',
        null
      );
      expect(interval).toEqual('rate(1 hour)');
    });

    it('should return default value when unit is undefined', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.FIXED_RATE,
        2,
        '',
        null
      );
      expect(interval).toEqual('rate(1 hour)');
    });

    it('should return rate with hours when fixedValue and unit are defined', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.FIXED_RATE,
        2,
        '',
        { value: 'hour', label: 'Hour' }
      );
      expect(interval).toEqual('rate(2 hours)');
    });

    it('should return rate with days when fixedValue, unit and value > 1', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.FIXED_RATE,
        3,
        '',
        { value: 'day', label: 'Day' }
      );
      expect(interval).toEqual('rate(3 days)');
    });

    it('should return rate with hour when fixedValue, unit and value <= 1', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.FIXED_RATE,
        1,
        '',
        { value: 'hour', label: 'Hour' }
      );
      expect(interval).toEqual('rate(1 hour)');
    });
  });

  describe('when type is ExecutionType.CRON_EXPRESS', () => {
    it('should return default value when cronExp is undefined', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.CRON_EXPRESS,
        10,
        '',
        null
      );
      expect(interval).toEqual('rate(1 hour)');
    });

    it('should return default value when cronExp is empty string', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.CRON_EXPRESS,
        0,
        '',
        null
      );
      expect(interval).toEqual('rate(1 hour)');
    });

    it('should return cron expression when cronExp is defined', () => {
      const interval = generateDataProcessingInterval(
        ExecutionType.CRON_EXPRESS,
        10,
        '0 0 * * *',
        null
      );
      expect(interval).toEqual('cron(0 0 * * *)');
    });
  });
});

describe('generateRedshiftInterval', () => {
  it('should return value if unit is not provided', () => {
    expect(generateRedshiftInterval(10)).toBe(10);
  });

  it('should convert hours to minutes', () => {
    expect(generateRedshiftInterval(2, 'hour')).toBe(120);
  });

  it('should convert days to minutes', () => {
    expect(generateRedshiftInterval(3, 'day')).toBe(4320);
  });
});

describe('extractAccountIdFromArn', () => {
  it('should extract account ID from valid ARN', () => {
    const arn =
      'arn:aws:redshift-serverless:ap-xxxx-1:111122223333:workgroup/xxxx-xxx-xxxxx-xxxxx';
    const accountId = extractAccountIdFromArn(arn);
    expect(accountId).toEqual('111122223333');
  });

  it('should return null for invalid ARN', () => {
    const arn = 'invalid-arn';
    const accountId = extractAccountIdFromArn(arn);
    expect(accountId).toEqual('');
  });

  it('should return null for null input', () => {
    const accountId = extractAccountIdFromArn('');
    expect(accountId).toEqual('');
  });
});

describe('validateProjectId', () => {
  test('should return true for valid project ids', () => {
    expect(validateProjectId('ids')).toBe(true);
    expect(validateProjectId('ids_123')).toBe(true);
    expect(validateProjectId('ids_name')).toBe(true);
    expect(validateProjectId('some_id_with_underscores')).toBe(true);
    expect(validateProjectId('id_with_numbers_123')).toBe(true);
    expect(
      validateProjectId(
        'maxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlengthidmaxlen'
      )
    ).toBe(true);
  });

  test('should return false for invalid project ids', () => {
    expect(validateProjectId('')).toBe(false);
    expect(validateProjectId('1id')).toBe(false);
    expect(validateProjectId('id-name')).toBe(false);
    expect(
      validateProjectId(
        'longidnamelongidnameistoolongidnameistoolongidnameistoolongidnameistoolongidnameistoolongidnameistoolongidnameistoolongidnameisl'
      )
    ).toBe(false);
  });
});

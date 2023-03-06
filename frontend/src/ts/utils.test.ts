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

import { generateStr, validateEmails } from './utils';

describe('generateStr', () => {
  it('generate 8 characters string', () => {
    const result = generateStr(8);
    expect(result.length).toBe(8);
  });
});

describe('generateStr', () => {
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
});

describe('validateEmails', () => {
  it('validate one incorrect email', () => {
    const result = validateEmails('email#example.com');
    expect(result).not.toBeTruthy();
  });
});

describe('validateEmails', () => {
  it('validate all email are valid', () => {
    const result = validateEmails('email@example.com, email2@example.com');
    expect(result).toBeTruthy();
  });
});

describe('validateEmails', () => {
  it('validate contains one incorrect email', () => {
    const result = validateEmails('email@example.com, email#example.com');
    expect(result).not.toBeTruthy();
  });
});

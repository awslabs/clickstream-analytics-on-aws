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

import { randomInt } from 'crypto';

export function isEmpty(a: any): boolean {
  if (a === '') return true; //Verify empty string
  if (a === 'null') return true; //Verify null string
  if (a === 'undefined') return true; //Verify undefined string
  if (!a && a !== 0 && a !== '') return true; //Verify undefined and null
  if (Array.prototype.isPrototypeOf(a) && a.length === 0) return true; //Verify empty array
  if (Object.prototype.isPrototypeOf(a) && Object.keys(a).length === 0) return true; //Verify empty objects
  return false;
}

export function generateRandomStr(length: number, charSet?: string): string {
  const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
  const upperCase = lowerCase.toUpperCase();
  const numStr = '0123456789';
  const other = '!#$%^&-_=+|';

  let password = '';
  let strCharset = charSet;
  if (!strCharset) {
    strCharset = charSet ?? lowerCase + upperCase + numStr + other;
    // Fix ERROR: password must contain a number
    password = lowerCase[Math.floor(randomInt(0, lowerCase.length))]
  + upperCase[Math.floor(randomInt(0, upperCase.length))]
  + numStr[Math.floor(randomInt(0, numStr.length))]
  + other[Math.floor(randomInt(0, other.length))];
  }

  while (password.length < length) {
    password += strCharset.charAt(Math.floor(randomInt(0, strCharset.length)));
  }
  return password;
};
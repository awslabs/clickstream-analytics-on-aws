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
const fs = require('fs');
const lockFilePath = './yarn.lock';

let yarnLock = fs.readFileSync(lockFilePath, 'utf8');

const regex =
  /"@click-stream\/shared-lib@file:\.\.\/packages\/shared-lib":\n\s+version "0\.0\.0"\n/gm;

// 测试是否找到匹配的文本
console.info('yarnLock:', yarnLock);
const isMatchFound = regex.test(yarnLock);
console.log(`Match found: ${isMatchFound}`);

// 使用正则表达式删除匹配的文本
const updatedContent = yarnLock.replace(regex, '');

// 将更新后的内容写回 yarn.lock 文件
fs.writeFileSync(lockFilePath, updatedContent);

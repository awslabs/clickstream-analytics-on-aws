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

import { readFileSync } from 'fs';
import { SQLDef } from '../src/analytics/private/model';

export function loadSQLFromFS(defs: SQLDef[], rootPath: string, prefix: string = '') {
  return defs.reduce((acc: { [key: string]: string }, item, _index) => {
    acc[`/opt/${prefix}${item.sqlFile}`] = testSqlContent(rootPath + prefix + item.sqlFile);
    return acc;
  }, {} as { [key: string]: string });
}

const testSqlContent = (filePath: string) => {
  const sqlTemplate = readFileSync(filePath, 'utf8');
  return sqlTemplate;
};
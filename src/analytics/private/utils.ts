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
import { join } from 'path';
import Mustache from 'mustache';
import { MustacheParamBaseType, SQLDef, SQLViewDef } from './model';

export function getSqlContent(
  sqlDef: {
    sqlFile: string;
  } | {
    viewName: string;
    spName?: string;
  },
  mustacheParam: MustacheParamBaseType,
  path: string = '/opt',
): string {
  const sqlTemplate = readFileSync(join(path, ('sqlFile' in sqlDef) ? sqlDef.sqlFile : `${sqlDef.spName ? sqlDef.spName : sqlDef.viewName}.sql`), 'utf8');
  return Mustache.render(sqlTemplate, {
    ...mustacheParam,
    viewName: 'viewName' in sqlDef ? sqlDef.viewName : undefined,
    spName: 'spName' in sqlDef ? sqlDef.spName : undefined,
  });
};

export function getSqlContents(
  sqlDef: SQLDef | SQLViewDef,
  mustacheParam: MustacheParamBaseType,
  path: string = '/opt',
): string[] {
  return getSqlContent(sqlDef, mustacheParam, path).split(';').filter(sql => sql.trim().length > 0).map(sql => sql.trim());
};
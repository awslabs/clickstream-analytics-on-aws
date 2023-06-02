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

import { join } from 'path';
import { CfnNamedQuery } from 'aws-cdk-lib/aws-athena';
import { Construct } from 'constructs';
import { AthenaBuiltInQueries } from './athena/query';
import { getSqlContent } from './utils';

export interface AthenaSavedQueryProps {
  readonly databaseName: string;
  readonly workGroup: string;
  readonly eventTable: string;
}

export type MustacheParamType = {
  database: string;
  eventTable: string;
}

export class AthenaSavedQuery extends Construct {

  constructor(scope: Construct, id: string, props: AthenaSavedQueryProps) {
    super(scope, id);

    const mustacheParam: MustacheParamType = {
      database: props.databaseName,
      eventTable: props.eventTable,
    };

    for (const query of AthenaBuiltInQueries) {
      new CfnNamedQuery(scope, `Query_${query.id}`, {
        name: `${query.name} - ${props.databaseName}`,
        description: query.description,
        queryString: getSqlContent(query.sqlFile, mustacheParam, join(__dirname, 'sqls/athena')),
        workGroup: props.workGroup,
        database: props.databaseName,
      });
    }
  }
}
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

import { IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { RedshiftSQLExecution, RedshiftSQLExecutionProps } from '../../analytics/private/app-schema';

export interface StreamingIngestionSchemasProps extends RedshiftSQLExecutionProps {
  readonly projectId: string;
  readonly appIds: string;
  readonly databaseName: string;
  readonly streamingIngestionRole: IRole;
}

export class StreamingIngestionSchemas extends RedshiftSQLExecution {

  constructor(scope: Construct, id: string, props: StreamingIngestionSchemasProps) {
    super(scope, id, props);
  }

  protected additionalPolicies(): PolicyStatement[] {
    return [];
  }

  protected getCustomResourceProperties(props: RedshiftSQLExecutionProps) {
    const properties = props as StreamingIngestionSchemasProps;
    // get schemaDefs files last modify timestamp
    return {
      projectId: properties.projectId,
      appIds: properties.appIds,
      databaseName: properties.databaseName,
      streamingRoleArn: properties.streamingIngestionRole.roleArn,
    };
  }
}

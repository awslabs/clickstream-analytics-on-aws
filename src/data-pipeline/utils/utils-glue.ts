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

import { Database, DataFormat, Table } from '@aws-cdk/aws-glue-alpha';
import { Column, Schema } from '@aws-cdk/aws-glue-alpha/lib/schema';
import { IBucket, Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { getSinkTableLocationPrefix } from './utils-common';
import { PARTITION_APP } from '../../common/constant';
import { SinkTableEnum } from '../data-pipeline';
import { getEventParameterTableColumns } from '../tables/event-parameter-table';
import { getEventTableColumns } from '../tables/event-table';
import { getIngestionEventsTableColumns } from '../tables/ingestion-events-tabe';
import { getItemTableColumns } from '../tables/item-table';
import { getODSEventsTableColumns } from '../tables/ods-events-table';
import { getUserTableColumns } from '../tables/user-table';

interface Props {
  readonly sourceS3Bucket: IBucket;
  readonly sourceS3Prefix: string;
  readonly sinkS3Bucket: IBucket;
  readonly sinkS3Prefix: string;
}

export class GlueUtil {

  public static newInstance(scope: Construct, props: Props) {
    return new this(scope, props);
  }

  private readonly props: Props;
  private readonly scope: Construct;

  private constructor(scope: Construct, props: Props) {
    this.props = props;
    this.scope = scope;
  }

  public createDatabase(name: string) {
    return new Database(this.scope, 'GlueDatabase', {
      databaseName: name,
    });
  }

  public createSourceTable(glueDatabase: Database, tableName: string) {
    return new Table(this.scope, 'SourceTable', {
      database: glueDatabase,
      description: 'ClickStream data pipeline source table',
      tableName,
      partitionKeys: [{
        name: 'year',
        comment: 'Partition (0)',
        type: Schema.STRING,
      }, {
        name: 'month',
        comment: 'Partition (1)',
        type: Schema.STRING,
      }, {
        name: 'day',
        comment: 'Partition (2)',
        type: Schema.STRING,
      }, {
        name: 'hour',
        comment: 'Partition (3)',
        type: Schema.STRING,
      }],
      columns: getIngestionEventsTableColumns(),
      compressed: false,
      dataFormat: DataFormat.JSON,
      bucket: Bucket.fromBucketName(this.scope, 'SourceBucket', this.props.sourceS3Bucket.bucketName),
      s3Prefix: `${this.props.sourceS3Prefix}`,
    });
  }

  public createSinkTables(glueDatabase: Database, projectId: string) {
    const colMap = {
      event: getEventTableColumns(),
      event_parameter: getEventParameterTableColumns(),
      user: getUserTableColumns(),
      item: getItemTableColumns(),
      ods_events: getODSEventsTableColumns(),
    };

    return [SinkTableEnum.EVENT,
      SinkTableEnum.EVENT_PARAMETER,
      SinkTableEnum.USER,
      SinkTableEnum.ITEM,
      SinkTableEnum.ODS_EVENTS].map(t => {
      const glueTable = this.createSinkTable(glueDatabase, projectId, t, colMap[t]);
      return glueTable;

    });
  }


  public createSinkTable(glueDatabase: Database, projectId: string, tableName: SinkTableEnum, columns: Column[]) {
    return new Table(this.scope, `${tableName}-SinkTable`, {
      database: glueDatabase,
      description: `ClickStream data pipeline ${tableName} table`,
      tableName,
      partitionKeys: [{
        name: PARTITION_APP,
        comment: 'Partition (0)',
        type: Schema.STRING,
      }, {
        name: 'partition_year',
        comment: 'Partition (1)',
        type: Schema.STRING,
      }, {
        name: 'partition_month',
        comment: 'Partition (2)',
        type: Schema.STRING,
      }, {
        name: 'partition_day',
        comment: 'Partition (3)',
        type: Schema.STRING,
      }],
      columns,
      compressed: false,
      dataFormat: DataFormat.PARQUET,

      bucket: Bucket.fromBucketName(this.scope, `SinkBucketFor${tableName}`, this.props.sinkS3Bucket.bucketName),
      s3Prefix: getSinkTableLocationPrefix(this.props.sinkS3Prefix, projectId, tableName),
    });
  }
}
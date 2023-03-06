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
import { Schema } from '@aws-cdk/aws-glue-alpha/lib/schema';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface Props {
  readonly sourceS3Bucket: string;
  readonly sourceS3Prefix: string;
  readonly sinkS3Bucket: string;
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
      columns: [{
        name: 'date',
        type: Schema.STRING,
      }, {
        name: 'data',
        type: Schema.STRING,
      }, {
        name: 'ip',
        type: Schema.STRING,
      }, {
        name: 'source_type',
        type: Schema.STRING,
      }, {
        name: 'rid',
        type: Schema.STRING,
      }, {
        name: 'ua',
        type: Schema.STRING,
      }, {
        name: 'm',
        type: Schema.STRING,
      }, {
        name: 'uri',
        type: Schema.STRING,
      }, {
        name: 'platform',
        type: Schema.STRING,
      }, {
        name: 'path',
        type: Schema.STRING,
      }, {
        name: 'appId',
        type: Schema.STRING,
      }, {
        name: 'compression',
        type: Schema.STRING,
      }, {
        name: 'timestamp',
        type: Schema.STRING,
      }],
      compressed: false,
      dataFormat: DataFormat.JSON,

      bucket: s3.Bucket.fromBucketName(this.scope, 'SourceBucket', this.props.sourceS3Bucket),
      s3Prefix: this.props.sourceS3Prefix,
    });
  }

  public createSinkTable(glueDatabase: Database, tableName: string) {
    return new Table(this.scope, 'SinkTable', {
      database: glueDatabase,
      description: 'ClickStream data pipeline sink table',
      tableName,
      partitionKeys: [{
        name: 'app_id',
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
      columns: [
        {
          name: 'app_info',
          type: Schema.struct([
            {
              name: 'app_id',
              type: Schema.STRING,
            },
            {
              name: 'install_source',
              type: Schema.STRING,
            },
            {
              name: 'install_store',
              type: Schema.STRING,
            },
            {
              name: 'version',
              type: Schema.STRING,
            },
          ],
          ),
        },
        {
          name: 'device',
          type: Schema.struct([
            {
              name: 'advertising_id',
              type: Schema.STRING,
            },
            {
              name: 'browser',
              type: Schema.STRING,
            },
            {
              name: 'browser_version',
              type: Schema.STRING,
            },
            {
              name: 'category',
              type: Schema.STRING,
            },
            {
              name: 'is_limited_ad_tracking',
              type: Schema.STRING,
            },
            {
              name: 'language',
              type: Schema.STRING,
            },
            {
              name: 'mobile_brand_name',
              type: Schema.STRING,
            },
            {
              name: 'mobile_marketing_name',
              type: Schema.STRING,
            },
            {
              name: 'mobile_model_name',
              type: Schema.STRING,
            },
            {
              name: 'mobile_os_hardware_model',
              type: Schema.STRING,
            },
            {
              name: 'operating_system',
              type: Schema.STRING,
            },
            {
              name: 'operating_system_version',
              type: Schema.STRING,
            },
            {
              name: 'time_zone_offset_seconds',
              type: Schema.BIG_INT,
            },
            {
              name: 'vendor_id',
              type: Schema.STRING,
            },
            {
              name: 'web_info',
              type: Schema.STRING,
            },
          ],
          ),
        },
        {
          name: 'ecommerce',
          type: Schema.array(
            Schema.struct([
              {
                name: 'key',
                type: Schema.STRING,
              },
              {
                name: 'value',
                type: Schema.struct([
                  {
                    name: 'double_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'float_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'int_value',
                    type: Schema.BIG_INT,
                  },
                  {
                    name: 'string_value',
                    type: Schema.STRING,
                  },
                ]),
              },
            ]),
          ),
        },
        {
          name: 'event_bundle_sequence_id',
          type: Schema.BIG_INT,
        },
        {
          name: 'event_date',
          type: Schema.STRING,
        },
        {
          name: 'event_dimensions',
          type: Schema.STRING,
        },
        {
          name: 'event_id',
          type: Schema.STRING,
        },
        {
          name: 'event_name',
          type: Schema.STRING,
        },
        {
          name: 'event_params',
          type: Schema.array(
            Schema.struct([
              {
                name: 'key',
                type: Schema.STRING,
              },
              {
                name: 'value',
                type: Schema.struct([
                  {
                    name: 'double_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'float_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'int_value',
                    type: Schema.BIG_INT,
                  },
                  {
                    name: 'string_value',
                    type: Schema.STRING,
                  },
                ]),
              },
            ]),
          ),
        },
        {
          name: 'event_previous_timestamp',
          type: Schema.BIG_INT,
        },
        {
          name: 'event_server_timestamp_offset',
          type: Schema.BIG_INT,
        },
        {
          name: 'event_timestamp',
          type: Schema.BIG_INT,
        },
        {
          name: 'event_value_in_usd',
          type: Schema.STRING,
        },
        {
          name: 'geo',
          type: Schema.struct([
            {
              name: 'city',
              type: Schema.STRING,
            },
            {
              name: 'continent',
              type: Schema.STRING,
            },
            {
              name: 'country',
              type: Schema.STRING,
            },
            {
              name: 'metro',
              type: Schema.STRING,
            },
            {
              name: 'region',
              type: Schema.STRING,
            },
            {
              name: 'sub_continent',
              type: Schema.STRING,
            },
          ]),
        },
        {
          name: 'ingest_timestamp',
          type: Schema.BIG_INT,
        },
        {
          name: 'items',
          type: Schema.array(
            Schema.struct([
              {
                name: 'key',
                type: Schema.STRING,
              },
              {
                name: 'value',
                type: Schema.struct([
                  {
                    name: 'double_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'float_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'int_value',
                    type: Schema.BIG_INT,
                  },
                  {
                    name: 'string_value',
                    type: Schema.STRING,
                  },
                ]),
              },
            ]),
          ),
        },
        {
          name: 'platform',
          type: Schema.STRING,
        },
        {
          name: 'privacy_info',
          type: Schema.struct([
            {
              name: 'ads_storage',
              type: Schema.STRING,
            },
            {
              name: 'analytics_storage',
              type: Schema.STRING,
            },
            {
              name: 'uses_transient_token',
              type: Schema.STRING,
            },
          ]),
        },
        {
          name: 'stream_id',
          type: Schema.STRING,
        },
        {
          name: 'traffic_source',
          type: Schema.struct([
            {
              name: 'medium',
              type: Schema.STRING,
            },
            {
              name: 'name',
              type: Schema.STRING,
            },
            {
              name: 'source',
              type: Schema.STRING,
            },
          ]),
        },
        {
          name: 'user_first_touch_timestamp',
          type: Schema.BIG_INT,
        },
        {
          name: 'user_id',
          type: Schema.STRING,
        },
        {
          name: 'user_ltv',
          type: Schema.STRING,
        },
        {
          name: 'user_properties',
          type: Schema.array(
            Schema.struct([
              {
                name: 'key',
                type: Schema.STRING,
              },
              {
                name: 'value',
                type: Schema.struct([
                  {
                    name: 'double_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'float_value',
                    type: Schema.STRING,
                  },
                  {
                    name: 'int_value',
                    type: Schema.BIG_INT,
                  },
                  {
                    name: 'set_timestamp_micros',
                    type: Schema.BIG_INT,
                  },
                  {
                    name: 'string_value',
                    type: Schema.STRING,
                  },
                ]),
              },
            ]),
          ),
        },
        {
          name: 'user_pseudo_id',
          type: Schema.STRING,
        },
      ],
      compressed: false,
      dataFormat: DataFormat.PARQUET,

      bucket: s3.Bucket.fromBucketName(this.scope, 'SinkBucket', this.props.sinkS3Bucket),
      s3Prefix: this.props.sinkS3Prefix,
    });
  }

}
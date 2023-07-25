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

import crypto from 'crypto';
import Mustache from 'mustache';
import { ApiSuccess } from '../common/types';
import { BatchExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { CreateDataSetCommandOutput, QuickSight,
  ColumnGroup,
  TransformOperation,
  ColumnTag, 
  InputColumn,
} from '@aws-sdk/client-quicksight'
import { logger } from '../common/powertools';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { buildFunnelView } from '../common/sql-builder';

const stsClient = new STSClient({region: 'us-east-1'});
const quickSight = new QuickSight({
  region: 'us-east-1'
});

async function getCredentialsFromRole(roleArn: string) {
  try {
    const assumeRoleCommand = new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: "redshift-data-api-role",
    });

    const response = await stsClient.send(assumeRoleCommand);
    const credentials = response.Credentials;

    return credentials;
  } catch (error) {
    console.error("Error occurred while assuming role:", error);
    throw error;
  }
}

export class ReportingServ {

  public async create(req: any, res: any, next: any) {
    try {

      logger.info(`req: ${req}`)
      //construct parameters to build sql
      const sql = buildFunnelView('app1', 'test_view_001', {
        schemaName: 'app1',
        computeMethod: 'USER_CNT',
        specifyJoinColumn: true,
        joinColumn: 'user_pseudo_id',
        conversionIntervalType: 'CUSTOMIZE',
        conversionIntervalInSeconds: 10*60,
        eventAndConditions: [
          {
            eventName: 'add_button_click',
          },
          {
            eventName: 'note_share',
          },
          {
            eventName: 'note_export',
          },
        ],
        timeStart: '2023-04-30',
        timeEnd: '2023-06-30',
        groupColumn: 'day',
      });

      logger.info(`sql: ${sql}`)


      const credentials = await getCredentialsFromRole('arn:aws:iam::451426793911:role/Clickstream-DataModelingR-RedshiftServerelssWorkgr-1B641805YKFF7')
      
      logger.info(JSON.stringify(credentials));

      const redshiftDataClient = new RedshiftDataClient({
        region: 'us-east-1',
        credentials: {
          accessKeyId: credentials?.AccessKeyId!,
          secretAccessKey: credentials?.SecretAccessKey!,
          sessionToken: credentials?.SessionToken,
        }
      })

      //create redshift view 
      const params = new BatchExecuteStatementCommand({
        Sqls: [sql],
        WorkgroupName: 'clickstream-project01-wvzh',
        // DbUser: 'admin',
        Database: 'project04',
        WithEvent: true,
      });

      await redshiftDataClient.send(params);

      //create quicksight dataset
      createDataSet(quickSight, '451426793911', 'arn:aws:quicksight:us-east-1:451426793911:user/default/clickstream', 'arn:aws:quicksight:us-east-1:451426793911:datasource/clickstream_datasource_project01_wvzh_f3635de0', 'app1', 'project_04', {
        name: 'test-0001',
        tableName: 'test_view_001',
        columns: test_columns,
        importMode: 'DIRECT_QUERY',
        customSql: 'select * from app1.test_view_001',
        projectedColumns: [
          'day',
          'add_button_click',
          'note_share',
          'note_export'
        ],
      })


      // create quicksight analysis
      
      //create quicksight dashboard


      return res.status(201).json(new ApiSuccess({ }, 'funnel visual created'));
    } catch (error) {
      next(error);
    }
  };

}

export const test_columns: InputColumn[] = [
  {
    Name: 'day',
    Type: 'STRING',
  },
  {
    Name: 'add_button_click',
    Type: 'INTEGER',
  },
  {
    Name: 'note_share',
    Type: 'INTEGER',
  },
  {
    Name: 'note_export',
    Type: 'INTEGER',
  },
];

const createDataSet = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  dataSourceArn: string,
  schema: string,
  databaseName: string,
  props: DataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

  try {
    const identifer = buildDataSetId(databaseName, schema, props.tableName);
    const datasetId = identifer.id;

    const mustacheParam: MustacheParamType = {
      schema,
    };

    logger.info('SQL to run:', Mustache.render(props.customSql, mustacheParam));

    let colGroups: ColumnGroup[] = [];
    if (props.columnGroups !== undefined) {
      for (const columnsGroup of props.columnGroups ) {
        colGroups.push({
          GeoSpatialColumnGroup: {
            Name: columnsGroup.geoSpatialColumnGroupName,
            Columns: columnsGroup.geoSpatialColumnGroupColumns,
          },
        });
      }
    }

    let dataTransforms: TransformOperation[] = [];
    let needLogicalMap = false;
    if (props.tagColumnOperations !== undefined) {
      needLogicalMap = true;
      for (const tagColOperation of props.tagColumnOperations ) {
        const tags: ColumnTag[] = [];
        for (const role of tagColOperation.columnGeographicRoles) {
          tags.push({
            ColumnGeographicRole: role,
          });
        }
        dataTransforms.push({
          TagColumnOperation: {
            ColumnName: tagColOperation.columnName,
            Tags: tags,
          },
        });
      }
    }

    if (props.projectedColumns !== undefined) {
      needLogicalMap = true;
      dataTransforms.push({
        ProjectOperation: {
          ProjectedColumns: props.projectedColumns,
        },
      });
    }

    let logicalMap = undefined;
    if (needLogicalMap) {
      logicalMap = {
        LogialTable1: {
          Alias: 'Alias_LogialTable1',
          Source: {
            PhysicalTableId: 'PhyTable1',
          },
          DataTransforms: dataTransforms,
        },
      };
    }

    logger.info('start to create dataset');
    // logger.info(`DatasetParameters: ${JSON.stringify(props.datasetParameters)}`);
    const dataset = await quickSight.createDataSet({
      AwsAccountId: awsAccountId,
      DataSetId: datasetId,
      Name: `${props.name}${identifer.tableNameIdentifer}-${identifer.schemaIdentifer}-${identifer.databaseIdentifer}`,
      Permissions: [{
        Principal: principalArn,
        Actions: [
          'quicksight:UpdateDataSetPermissions',
          'quicksight:DescribeDataSet',
          'quicksight:DescribeDataSetPermissions',
          'quicksight:PassDataSet',
          'quicksight:DescribeIngestion',
          'quicksight:ListIngestions',
          'quicksight:UpdateDataSet',
          'quicksight:DeleteDataSet',
          'quicksight:CreateIngestion',
          'quicksight:CancelIngestion',
        ],
      }],

      ImportMode: props.importMode,
      PhysicalTableMap: {
        PhyTable1: {
          CustomSql: {
            DataSourceArn: dataSourceArn,
            Name: props.tableName,
            SqlQuery: Mustache.render(props.customSql, mustacheParam),
            Columns: props.columns,
          },
        },
      },
      LogicalTableMap: needLogicalMap ? logicalMap : undefined,
      ColumnGroups: colGroups.length > 0 ? colGroups : undefined,
      DataSetUsageConfiguration: {
        DisableUseAsDirectQuerySource: false,
        DisableUseAsImportedSource: false,
      },
    });

    logger.info(`create dataset finished. Id: ${datasetId}`);

    return dataset;

  } catch (err: any) {
    logger.error(`Create QuickSight dataset failed due to: ${(err as Error).message}`);
    throw err;
  }
};

export const buildDashBoardId = function (databaseName: string, schema: string): Identifer {
  const schemaIdentifer = truncateString(schema, 40);
  const databaseIdentifer = truncateString(databaseName, 40);
  const suffix = crypto.createHash('sha256').update(`${databaseName}${schema}`).digest('hex').substring(0, 8);
  return {
    id: `clickstream_dashboard_${databaseIdentifer}_${schemaIdentifer}_${suffix}`,
    idSuffix: suffix,
    databaseIdentifer,
    schemaIdentifer,
  };
};

export const buildAnalysisId = function (databaseName: string, schema: string): Identifer {
  const schemaIdentifer = truncateString(schema, 40);
  const databaseIdentifer = truncateString(databaseName, 40);
  const suffix = crypto.createHash('sha256').update(`${databaseName}${schema}`).digest('hex').substring(0, 8);
  return {
    id: `clickstream_analysis_${databaseIdentifer}_${schemaIdentifer}_${suffix}`,
    idSuffix: suffix,
    databaseIdentifer,
    schemaIdentifer,
  };
};

const buildDataSetId = function (databaseName: string, schema: string, tableName: string): Identifer {
  const tableNameIdentifer = truncateString(tableName.replace(/clickstream_/g, ''), 40);
  const schemaIdentifer = truncateString(schema, 15);
  const databaseIdentifer = truncateString(databaseName, 15);
  const suffix = crypto.createHash('sha256').update(`${databaseName}${schema}${tableName}`).digest('hex').substring(0, 8);
  return {
    id: `clickstream_dataset_${databaseIdentifer}_${schemaIdentifer}_${tableNameIdentifer}_${suffix}`,
    idSuffix: suffix,
    databaseIdentifer,
    schemaIdentifer,
    tableNameIdentifer,
  };

};

interface Identifer {
  id: string;
  idSuffix: string;
  databaseIdentifer: string;
  schemaIdentifer: string;
  tableNameIdentifer?: string;
}

export function truncateString(source: string, length: number): string {
  if (source.length > length) {
    return source.substring(0, length);
  }
  return source;
};

export type MustacheParamType = {
  schema: string;
}


export interface TagColumnOperationProps {
  columnName: string;
  columnGeographicRoles: string[];
};

export interface ColumnGroupsProps {
  geoSpatialColumnGroupName: string;
  geoSpatialColumnGroupColumns: string[];
};

export interface DataSetProps {
  name: string;
  tableName: string;
  columns: InputColumn[];
  importMode: string;
  columnGroups?: ColumnGroupsProps[];
  projectedColumns?: string[];
  tagColumnOperations?: TagColumnOperationProps[];
  customSql: string;
};
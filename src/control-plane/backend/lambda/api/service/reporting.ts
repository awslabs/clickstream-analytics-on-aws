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

import { ApiFail, ApiSuccess, PipelineStackType } from '../common/types';
import { BatchExecuteStatementCommand, RedshiftDataClient } from '@aws-sdk/client-redshift-data';
import { DataSetReference, QuickSight, TemplateVersionDefinition } from '@aws-sdk/client-quicksight'
import { logger } from '../common/powertools';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';
import { buildFunnelView } from '../common/sql-builder';
import { getQuickSightSubscribeRegion } from '../store/aws/quicksight';
import { awsAccountId, awsPartition, awsRegion } from '../common/constants';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { ClickStreamStore } from '../store/click-stream-store';
import { CPipeline } from '../model/pipeline';
import { createAnalysis, createDataSet, createTemplateFromDefinition, funnelVisualColumns, getTemplateDefinition } from '../common/quicksight/reporting-utils';
import { readFileSync } from 'fs';
import { join } from 'path';

const store: ClickStreamStore = new DynamoDbStore();
const stsClient = new STSClient({region: 'us-east-1'});
const quickSight = new QuickSight({
  region: awsRegion
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

  public async createFunnelVisual(req: any, res: any, next: any) {
    try {
      logger.info(`req: ${req}`);

      const query = req.body;
      //construct parameters to build sql
      const viewName = query.viewName;
      const sql = buildFunnelView(query.appId, viewName, {
        schemaName: query.schemaName,
        computeMethod: query.computeMethod,
        specifyJoinColumn: query.specifyJoinColumn,
        joinColumn: query.joinColumn,
        conversionIntervalType: query.conversionIntervalType,
        conversionIntervalInSeconds: query.conversionIntervalInSeconds,
        eventAndConditions: query.eventAndConditions,
        timeScopeType: query.timeScopeType,
        timeStart: query.timeScopeType === 'FIXED' ? query.timeStart : undefined,
        timeEnd: query.timeScopeType === 'FIXED' ? query.timeEnd : undefined,
        lastN: query.lastN,
        timeUnit: query.timeUnit,
        groupColumn: query.groupColumn,
      });

      logger.info(`sql: ${sql}`)

      //get requied parameters from ddb and stack output.
      const pipeline = await store.getPipeline(query.projectId, query.pipelineId);
      if (!pipeline) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      const redshiftRegion = pipeline.region

      if (!pipeline.dataModeling?.redshift) {
        return res.status(404).send(new ApiFail('Redshift not enabled in the pipeline'));
      }
      const isProvisionedRedshift = pipeline.dataModeling?.redshift?.provisioned ? true : false;

      let workgroupName = undefined;
      let dataApiRole = undefined;

      const cPipeline = new CPipeline(pipeline);
      const modelingStackOutputs = await cPipeline.getStackOutputs(PipelineStackType.DATA_MODELING_REDSHIFT);

      for (const [name, value] of modelingStackOutputs) {
        if(name.endsWith('WorkgroupName')){
          workgroupName = value;
        }
        if(name.endsWith('DataApiRole')){
          dataApiRole = value;
        }
      }
      if(!workgroupName && !isProvisionedRedshift) {
        return res.status(404).send(new ApiFail('Redshift serverless workgroup not found'));
      }
      if(!dataApiRole) {
        return res.status(404).send(new ApiFail('Redshift data api role not found'));
      }

      let datasourceArn = undefined;
      let quicksightInternalUser = undefined;
      const reportingStackOutputs = await cPipeline.getStackOutputs(PipelineStackType.REPORTING);
      for (const [name, value] of reportingStackOutputs) {
        if(name.endsWith('DataSourceArn')){
          datasourceArn = value;
        }
        if(name.endsWith('QuickSightInternalUser')){
          quicksightInternalUser = value;
        }
      }
      if(!datasourceArn) {
        return res.status(404).send(new ApiFail('QuickSight data source arn not found'));
      }
      if(!quicksightInternalUser) {
        return res.status(404).send(new ApiFail('QuickSight internal user not found'));
      }

      //quicksight user name
      const quicksightPublicUser = pipeline.reporting?.quickSight?.user;
      if(!quicksightPublicUser) {
        return res.status(404).send(new ApiFail('QuickSight user not found'));
      }

      // let quicksightUser = ''
      // if(query.action === 'PREVIEW') {
      //   quicksightUser = quicksightInternalUser!;
      // } else if(query.action === 'PUBLISH') {
        
      //   quicksightUser = quicksightPublicUser;
      // } else {
      //   return res.status(400).send(new ApiFail('Bad request'));
      // }
      //get requied parameters from ddb and stack output.
      
      const quickSightSubscribeRegion = await getQuickSightSubscribeRegion();
      const quickSightPricipal = `arn:${awsPartition}:quicksight:${quickSightSubscribeRegion}:${awsAccountId}:user/default/${quicksightPublicUser}`;
      // const quickSightInternalUserPricipal = `arn:${awsPartition}:quicksight:${quickSightSubscribeRegion}:${awsAccountId}:user/default/${quicksightInternalUser}`;

      //get redshift client
      const credentials = await getCredentialsFromRole(dataApiRole);
      const redshiftDataClient = new RedshiftDataClient({
        region: redshiftRegion,
        credentials: {
          accessKeyId: credentials?.AccessKeyId!,
          secretAccessKey: credentials?.SecretAccessKey!,
          sessionToken: credentials?.SessionToken,
        }
      })

      //create view in redshift
      const params = new BatchExecuteStatementCommand({
        Sqls: [sql],
        WorkgroupName: workgroupName,
        Database: query.projectId,
        WithEvent: false,
        ClusterIdentifier: isProvisionedRedshift ? pipeline.dataModeling?.redshift.provisioned?.clusterIdentifier : undefined,
        DbUser: isProvisionedRedshift ? pipeline.dataModeling?.redshift.provisioned?.dbUser : undefined,
      });

      await redshiftDataClient.send(params);

      //create quicksight dataset
      createDataSet(quickSight, awsAccountId!, quickSightPricipal, datasourceArn, {
        name: '',
        tableName: viewName,
        columns: funnelVisualColumns,
        importMode: 'DIRECT_QUERY',
        customSql: `select * from ${query.appId}.${viewName}`,
        projectedColumns: [
          'event_date',
          'event_name',
          'x_id',
        ],
      })


      let templateDef = JSON.parse(readFileSync(join(__dirname, '')).toString()) as TemplateVersionDefinition;

      //create quicksight tempalte
      const templateArn = await createTemplateFromDefinition(quickSight, awsAccountId!, quickSightPricipal, templateDef)

    
      // create quicksight analysis
      const datasetRefs: DataSetReference[] = [];
      const sourceEntity = {
        SourceTemplate: {
          Arn: templateArn,
          DataSetReferences: datasetRefs,
        },
      };
      createAnalysis(quickSight, awsAccountId!, quickSightPricipal, sourceEntity, '')
      
      //create quicksight dashboard


      return res.status(201).json(new ApiSuccess({ }, 'funnel visual created'));
    } catch (error) {
      next(error);
    }
  };

}


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

import {
  QuickSight,
  VpcConnectionProperties,
  DashboardSourceEntity,
  AnalysisSourceEntity,
  CreateDataSourceCommandOutput,
  CreateTemplateCommandOutput,
  CreateDataSetCommandOutput,
  CreateAnalysisCommandOutput,
  CreateDashboardCommandOutput,
  ResourceNotFoundException,
} from '@aws-sdk/client-quicksight';
import { SSM } from '@aws-sdk/client-ssm';
import { Context, CloudFormationCustomResourceEvent } from 'aws-lambda';
import { BIUserCredential } from '../../../../common/model';
import { logger } from '../../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../../common/sdk-client-config';
import {
  QuicksightCustomResourceLabmdaProps,
  dataSetActions,
  waitForAnalysisCreateCompleted,
  waitForAnalysisDeleteCompleted,
  waitForDashboardCreateCompleted,
  waitForDashboardDeleteCompleted,
  waitForDataSetCreateCompleted,
  waitForDataSetDeleteCompleted,
  waitForDataSourceCreateCompleted,
  waitForDataSourceDeleteCompleted,
  waitForTemplateCreateCompleted,
  waitForTemplateDeleteCompleted,
  QuickSightDashboardDefProps,
  QuickSightTemplateProps,
  RedShiftDataSourceProps,
  QuickSightDataSetProps,
} from '../../../private/dashboard';

type ResourceEvent = CloudFormationCustomResourceEvent;

type QuicksightCustomResourceLabmdaPropsType = QuicksightCustomResourceLabmdaProps & {
  readonly ServiceToken: string;
}

interface ReturnData {
  Data: {
    dashboards: string[];
  };
}

const sleep = (ms: number) => {
  return new Promise(resolve=>setTimeout(resolve, ms));
};

export const handler = async (event: ResourceEvent, _context: Context): Promise<ReturnData> => {
  logger.info(JSON.stringify(event));

  const props = event.ResourceProperties as QuicksightCustomResourceLabmdaPropsType;

  const region = props.awsRegion;
  const partition = props.awsPartition;
  const quickSight = new QuickSight({
    region,
    ...aws_sdk_client_common_config,
  });
  const ssm = new SSM({
    region,
    ...aws_sdk_client_common_config,
  });

  const awsAccountId = props.awsAccountId;
  const namespace: string = props.quickSightNamespace;
  const quickSightUser: string = props.quickSightUser;
  let principalArn = `arn:${partition}:quicksight:us-east-1:${awsAccountId}:user/${namespace}/${quickSightUser}`;
  if (props.quickSightPrincipalArn !== '') {
    principalArn = props.quickSightPrincipalArn;
  }

  if (event.RequestType === 'Create' || event.RequestType === 'Update' ) {

    let dashboards: string[] = [];

    const databaseSchemaNames = props.schemas;

    if ( databaseSchemaNames.trim().length > 0 ) {
      const defString = JSON.stringify(props.dashboardDefProps);

      logger.info(`databaseSchemaNames: ${databaseSchemaNames}`);

      for (const schemaName of databaseSchemaNames.split(',')) {
        logger.info('schemaName: ', schemaName);
        const dashboardDefProps: QuickSightDashboardDefProps = JSON.parse(defString.slice().replace(/##SCHEMA##/g, schemaName));
        logger.info('dashboardDefProps', JSON.stringify(dashboardDefProps));

        const dashboard = await createQuickSightDashboard(quickSight, ssm, awsAccountId, principalArn, dashboardDefProps);
        logger.info('created dashboard:', JSON.stringify(dashboard));
        dashboards.push(dashboard?.Arn!);
      };
    } else {
      logger.info('empty database schema.');
    }

    return {
      Data: {
        dashboards,
      },
    };
  } else {
    logger.warn('Ignore Cloudformation Delete request to keep QuickSight resources.');
    return {
      Data: { dashboards: [] },
    };
  }
};

const createDataSource = async (quickSight: QuickSight, ssm: SSM, awsAccountId: string, principalArn: string, props: RedShiftDataSourceProps)
: Promise<CreateDataSourceCommandOutput|undefined> => {
  try {
    const datasourceId = props.id;
    //delete datasource if it exist.
    try {
      const datasource = await quickSight.describeDataSource({
        AwsAccountId: awsAccountId,
        DataSourceId: datasourceId,
      });
      logger.info('exist datasource: ', datasource.DataSource?.Arn!);

      if (datasource.DataSource?.DataSourceId === datasourceId) {
        logger.info('delete exist datasource');
        await quickSight.deleteDataSource({
          AwsAccountId: awsAccountId,
          DataSourceId: datasourceId,
        });
        await waitForDataSourceDeleteCompleted(quickSight, awsAccountId, datasourceId);
      }
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Datasource not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    //whether to use quicksight vpc connection
    let vpcConnectionPropertiesProperty: VpcConnectionProperties | undefined;
    if (props.vpcConnectionArn !== 'public') {
      vpcConnectionPropertiesProperty = {
        VpcConnectionArn: props.vpcConnectionArn,
      };
    } else {
      vpcConnectionPropertiesProperty = undefined;
    }
    //create datasource
    const secretInfo = await ssm.getParameter({
      Name: `/${props.credentialParameter}`,
      WithDecryption: true,
    });
    const biUserCredential = JSON.parse(secretInfo.Parameter?.Value!) as BIUserCredential;

    logger.info('start to create datasource');
    const dataSource = await quickSight.createDataSource({
      AwsAccountId: awsAccountId,
      DataSourceId: datasourceId,
      Name: datasourceId,
      Type: 'REDSHIFT',
      Credentials: {
        CredentialPair: {
          Username: biUserCredential.username,
          Password: biUserCredential.password,
        },
      },
      DataSourceParameters: {
        RedshiftParameters: {
          Database: props.databaseName,
          Host: props.endpoint,
          Port: Number(props.port),
        },
      },
      Permissions: [{
        Principal: principalArn,
        Actions: [
          'quicksight:UpdateDataSourcePermissions',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:DescribeDataSource',
          'quicksight:DeleteDataSource',
          'quicksight:UpdateDataSource',
        ],
      }],
      VpcConnectionProperties: vpcConnectionPropertiesProperty,
    });
    await waitForDataSourceCreateCompleted(quickSight, awsAccountId, datasourceId);
    logger.info('datasource id: ', JSON.stringify(dataSource));

    const datasourceArn = dataSource.Arn!;
    logger.info('create datasource finished with arn: ', datasourceArn);

    return dataSource;

  } catch (err: any) {
    logger.error(`Create QuickSight datasource failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const createTemplate = async (quickSight: QuickSight, awsAccountId: string, principalArn: string, props: QuickSightTemplateProps)
: Promise<CreateTemplateCommandOutput|undefined> => {

  //create template
  try {
    const templateId = props.id;

    //delete template if it exist.
    try {
      const template = await quickSight.describeTemplate({
        AwsAccountId: awsAccountId,
        TemplateId: templateId,
      });
      logger.info('exist template: ', JSON.stringify(template));

      if (template.Template?.TemplateId === templateId) {
        logger.info('delete exist template');
        await quickSight.deleteTemplate({
          AwsAccountId: awsAccountId,
          TemplateId: templateId,
        });
        await waitForTemplateDeleteCompleted(quickSight, awsAccountId, templateId);
      }
    } catch (err: any) {

      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Template not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    logger.info('start to create template');
    const template = await quickSight.createTemplate({
      AwsAccountId: awsAccountId,
      TemplateId: templateId,
      Name: props.name ?? templateId,
      Permissions: [{
        Principal: principalArn,
        Actions: [
          'quicksight:UpdateTemplatePermissions',
          'quicksight:DescribeTemplatePermissions',
          'quicksight:DescribeTemplate',
          'quicksight:DeleteTemplate',
          'quicksight:UpdateTemplate',
        ],
      }],

      // Definition: TemplateDefV1,

      SourceEntity: {
        SourceTemplate: {
          Arn: props.templateArn,
        },
      },
    })
    ;

    await waitForTemplateCreateCompleted(quickSight, awsAccountId, templateId);
    logger.info('Template: ', JSON.stringify(template));

    const templateArn = template.Arn!;
    logger.info('create template finished. arn: ', templateArn);

    return template;

  } catch (err: any) {
    logger.error(`Create QuickSight template failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const createDataSet = async (quickSight: QuickSight, awsAccountId: string, principalArn: string, props: QuickSightDataSetProps)
: Promise<CreateDataSetCommandOutput|undefined> => {

  try {
    const datasetId = props.id;
    //delete dataset if it exist.
    try {
      const dataset = await quickSight.describeDataSet({
        AwsAccountId: awsAccountId,
        DataSetId: datasetId,
      });
      logger.info('exist dataset: ', JSON.stringify(dataset));

      if (dataset.DataSet?.DataSetId === datasetId) {
        logger.info('delete exist dataset');
        await quickSight.deleteDataSet({
          AwsAccountId: awsAccountId,
          DataSetId: datasetId,
        });
        await waitForDataSetDeleteCompleted(quickSight, awsAccountId, datasetId);
      }
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Dataset not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    logger.info('start to create dataset');
    let dataset: CreateDataSourceCommandOutput | undefined = undefined;
    for (const i of Array(60).keys()) {
      logger.info(`create dataset round: ${i} `);
      try {
        dataset = await quickSight.createDataSet({
          AwsAccountId: awsAccountId,
          DataSetId: datasetId,
          Name: props.name ?? props.id,
          Permissions: [{
            Principal: principalArn,
            Actions: dataSetActions,
          }],

          ImportMode: props.importMode,
          PhysicalTableMap: props.physicalTableMap,
          LogicalTableMap: props.logicalTableMap,
        });
        break;
      } catch (err: any) {
        if ( (err as Error).name === 'ConflictException'
          && (err as Error).message.includes('deletion is in progress')) {
          logger.info('dataset deletion is in progress wait 3 seconds');
          await sleep(3000);
          continue;
        } else {
          throw err;
        }
      }
    }

    await waitForDataSetCreateCompleted(quickSight, awsAccountId, datasetId);
    logger.info('create dataset finished. arn: ', dataset?.Arn!);

    return dataset;

  } catch (err: any) {
    logger.error(`Create QuickSight dataset failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const createAnalysis = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  sourceEntity: AnalysisSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateAnalysisCommandOutput|undefined> => {

  try {
    //delete analysis if it exist.
    try {
      const analysis = await quickSight.describeAnalysis({
        AwsAccountId: awsAccountId,
        AnalysisId: props.analysisId,
      });
      logger.info('exist analysis: ', JSON.stringify(analysis));

      if (analysis.Analysis?.AnalysisId === props.analysisId) {
        logger.info('delete exist analysis');
        await quickSight.deleteAnalysis({
          AwsAccountId: awsAccountId,
          AnalysisId: props.analysisId,
          ForceDeleteWithoutRecovery: true,
        });
        await waitForAnalysisDeleteCompleted(quickSight, awsAccountId, props.analysisId);
      }
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Analysis not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    logger.info('start to create analysis');
    const analysis = await quickSight.createAnalysis({
      AwsAccountId: awsAccountId,
      AnalysisId: props.analysisId,
      Name: props.analysisName ?? props.analysisId,
      Permissions: [{
        Principal: principalArn,
        Actions: [
          'quicksight:DescribeAnalysis',
          'quicksight:UpdateAnalysisPermissions',
          'quicksight:QueryAnalysis',
          'quicksight:UpdateAnalysis',
          'quicksight:RestoreAnalysis',
          'quicksight:DeleteAnalysis',
          'quicksight:DescribeAnalysisPermissions',
        ],
      }],

      SourceEntity: sourceEntity,
    });
    await waitForAnalysisCreateCompleted(quickSight, awsAccountId, props.analysisId);
    logger.info('create analysis finished. arn: ', analysis.Arn!);

    return analysis;

  } catch (err: any) {
    logger.error(`Create QuickSight analysis failed due to: ${(err as Error).message}`);
    throw err;
  }
};


const createDashboard = async (quickSight: QuickSight, awsAccountId: string, principalArn: string,
  sourceEntity: DashboardSourceEntity, props: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {
  try {
    //delete dashboard if it exist.
    try {
      const dashbaord = await quickSight.describeDashboard({
        AwsAccountId: awsAccountId,
        DashboardId: props.dashboardId,
      });
      logger.info('exist dashboard: ', JSON.stringify(dashbaord));

      if (dashbaord.Dashboard?.DashboardId === props.dashboardId) {
        logger.info('delete exist dashboard');
        await quickSight.deleteDashboard({
          AwsAccountId: awsAccountId,
          DashboardId: props.dashboardId,
        });

        await waitForDashboardDeleteCompleted(quickSight, awsAccountId, props.dashboardId);
      }
    } catch (err: any) {
      if ((err as Error) instanceof ResourceNotFoundException) {
        logger.info('Dashboard not exist. skip delete operation.');
      } else {
        throw err;
      }
    }

    logger.info('start to create dashboard');
    const dashboard = await quickSight.createDashboard({
      AwsAccountId: awsAccountId,
      DashboardId: props.dashboardId,
      Name: props.dashboardName ?? props.dashboardId,
      Permissions: [{
        Principal: principalArn,
        Actions: [
          'quicksight:DescribeDashboard',
          'quicksight:ListDashboardVersions',
          'quicksight:UpdateDashboardPermissions',
          'quicksight:QueryDashboard',
          'quicksight:UpdateDashboard',
          'quicksight:DeleteDashboard',
          'quicksight:DescribeDashboardPermissions',
          'quicksight:UpdateDashboardPublishedVersion',
        ],
      }],

      SourceEntity: sourceEntity,

      DashboardPublishOptions: {
        AdHocFilteringOption: {
          AvailabilityStatus: 'DISABLED',
        },
      },

    });
    await waitForDashboardCreateCompleted(quickSight, awsAccountId, props.dashboardId);
    logger.info('create dashboard finished. arn: ', dashboard.Arn!);

    return dashboard;

  } catch (err: any) {
    logger.error(`Create QuickSight dashboard failed due to: ${(err as Error).message}`);
    throw err;
  }
};

const createQuickSightDashboard = async (quickSight: QuickSight, ssm: SSM, accountId: string, principalArn: string,
  dashboardDef: QuickSightDashboardDefProps)
: Promise<CreateDashboardCommandOutput|undefined> => {

  const dataDef = dashboardDef.data;
  const dataSource = dataDef.dataSource;
  await createDataSource(quickSight, ssm, accountId, principalArn, dataSource);

  const tempalteDef = dashboardDef.template;
  logger.info('tempalteDef', JSON.stringify(tempalteDef));

  const template = await createTemplate(quickSight, accountId, principalArn, tempalteDef);

  const dataSets = dataDef.dataSets;
  const datasetRef = dataDef.dataSetReferences;
  for ( const dataSet of dataSets) {
    const createdDataset = await createDataSet(quickSight, accountId, principalArn, dataSet);
    logger.info('data set arn:', createdDataset?.Arn!);
  }

  const sourceEntity = {
    SourceTemplate: {
      Arn: template?.Arn,
      DataSetReferences: datasetRef,
    },
  };

  await createAnalysis(quickSight, accountId, principalArn, sourceEntity, dashboardDef);

  const dashboard = await createDashboard(quickSight, accountId, principalArn, sourceEntity, dashboardDef);

  return dashboard;

};
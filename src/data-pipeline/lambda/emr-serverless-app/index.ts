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


import { EMRServerlessClient, CreateApplicationCommand, Architecture, CreateApplicationCommandInput, DeleteApplicationCommand } from '@aws-sdk/client-emr-serverless';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { putStringToS3, readS3ObjectAsJson } from '../../../common/s3';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';

export interface ResourcePropertiesType {
  ServiceToken: string;
  projectId: string;
  name: string;
  version: string;
  secourityGroupId: string;
  subnetIds: string;
  idleTimeoutMinutes: string;
}

const region = process.env.AWS_REGION!;
const stackId = process.env.STACK_ID!;
const s3Bucket = process.env.PIPELINE_S3_BUCKET_NAME!;
let s3Prefix = process.env.PIPELINE_S3_PREFIX!;

if (!s3Prefix.endsWith('/')) {
  s3Prefix = s3Prefix + '/';
}

const appIdKey = s3Prefix + stackId + '/config/emr-serverless-applicationId.json';

const emrServerlessClient = new EMRServerlessClient({
  ...aws_sdk_client_common_config,
  region,
});

export const handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  logger.info(JSON.stringify(event));
  try {
    const res = await _handler(event, context);
    logger.info('lambda returned', { res });
    return res;
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(event: CloudFormationCustomResourceEvent, context: Context) {
  logger.info(`functionName: ${context.functionName}`);
  const props = event.ResourceProperties as ResourcePropertiesType;
  if (event.RequestType == 'Delete') {
    await deleteEMRServerlessApp();
    return;
  } else {
    const applicationId = await createEMRServerlessApp(props);
    return {
      Data: {
        ApplicationId: applicationId,
      },
    };
  }
}

async function createEMRServerlessApp(props: ResourcePropertiesType): Promise<string> {
  const input: CreateApplicationCommandInput = {
    name: props.name,
    releaseLabel: props.version,
    type: 'SPARK',
    architecture: Architecture.X86_64,
    networkConfiguration: {
      subnetIds: props.subnetIds.split(','),
      securityGroupIds: [props.secourityGroupId],
    },
    autoStartConfiguration: {
      enabled: true,
    },
    autoStopConfiguration: {
      enabled: true,
      idleTimeoutMinutes: parseInt(props.idleTimeoutMinutes),
    },
  };

  logger.info('CreateApplicationCommand input', { input });
  const command = new CreateApplicationCommand(input);
  const response = await emrServerlessClient.send(command);
  const applicationId = response.applicationId!;
  logger.info('created emr application applicationId:' + applicationId);

  logger.info('s3Bucket:' + s3Bucket + ', appIdKey:' + appIdKey);
  let appIdCofing = await readS3ObjectAsJson(s3Bucket, appIdKey);
  const nowStr = process.env.TEST_TIME_NOW_STR || new Date().toISOString();

  if (appIdCofing) {
    logger.info('find appIdCofing', { appIdCofing });
    // only save previous 5 appIds
    const applicationIds = appIdCofing.applicationIds.slice(-5);
    // delete old one
    for (const appInfo of applicationIds) {
      await deleteEMRServerlessAppById(appInfo.applicationId);
    }
    applicationIds.push({
      applicationId,
      createAt: nowStr,
    });
    appIdCofing.applicationIds = applicationIds;
  } else {
    logger.info('not find appIdCofing');
    appIdCofing = {
      applicationIds: [
        {
          applicationId,
          createAt: nowStr,
        },
      ],
    };
  }

  logger.info('save new appIdCofing', appIdCofing);
  await putStringToS3(JSON.stringify(appIdCofing), s3Bucket, appIdKey);
  return applicationId;
}

async function deleteEMRServerlessApp() {
  const appIdCofing = await readS3ObjectAsJson(s3Bucket, appIdKey);
  if (appIdCofing) {
    logger.info('find appIdCofing', { appIdCofing });
    const applicationIds = appIdCofing.applicationIds;
    for (const app of applicationIds) {
      await deleteEMRServerlessAppById(app.applicationId);
    }
  }
}

async function deleteEMRServerlessAppById(appId: string) {
  try {
    logger.info('delete ' + appId);
    await emrServerlessClient.send(new DeleteApplicationCommand({
      applicationId: appId,
    }));
  } catch (err) {
    // if app is 'started' state, which cannot be deleted,  we ignore this error.
    logger.error(err + '');
  }
}



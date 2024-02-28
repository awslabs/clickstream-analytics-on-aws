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


import { EMR_ARCHITECTURE_AUTO } from '@aws/clickstream-base-lib';
import { EMRServerlessClient, CreateApplicationCommand, Architecture, CreateApplicationCommandInput, DeleteApplicationCommand } from '@aws-sdk/client-emr-serverless';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { putStringToS3, readS3ObjectAsJson } from '../../../common/s3';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { EmrApplicationArchitectureType } from '../../../data-pipeline-stack';

export interface ResourcePropertiesType {
  ServiceToken: string;
  projectId: string;
  name: string;
  version: string;
  securityGroupId: string;
  subnetIds: string;
  idleTimeoutMinutes: string;
  architecture: EmrApplicationArchitectureType;
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
    return {
      Data: {},
    };
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
  let architecture = props.architecture;
  let javaPathSuffix = 'x86_64';
  if (props.architecture === EMR_ARCHITECTURE_AUTO) {
    architecture = Architecture.ARM64;
    if (region.startsWith('cn-')) {
      architecture = Architecture.X86_64;
    }
  }
  if (architecture == Architecture.ARM64) {
    javaPathSuffix = 'aarch64';
  }

  let javaVersion = 8;
  if (compareVersions(props.version, 'emr-6.11.0') >= 0) {
    javaVersion = 17;
  }
  // "/usr/lib/jvm/java-17-amazon-corretto.x86_64/"
  // "/usr/lib/jvm/java-17-amazon-corretto.aarch64/"
  const javaHome = `/usr/lib/jvm/java-${javaVersion}-amazon-corretto.${javaPathSuffix}/`;

  const input: CreateApplicationCommandInput = {
    name: props.name.slice(0, 64), // serverless app name length should not more than 64
    releaseLabel: props.version,
    type: 'SPARK',
    architecture: architecture as Architecture,
    networkConfiguration: {
      subnetIds: props.subnetIds.split(','),
      securityGroupIds: [props.securityGroupId],
    },
    autoStartConfiguration: {
      enabled: true,
    },
    autoStopConfiguration: {
      enabled: true,
      idleTimeoutMinutes: parseInt(props.idleTimeoutMinutes),
    },
    runtimeConfiguration: [
      {
        classification: 'spark-defaults',
        properties: {
          'spark.emr-serverless.driverEnv.JAVA_HOME': javaHome,
          'spark.executorEnv.JAVA_HOME': javaHome,
        },
      },
    ],
  };

  logger.info('CreateApplicationCommand input', { input });
  const command = new CreateApplicationCommand(input);
  const response = await emrServerlessClient.send(command);
  const applicationId = response.applicationId!;
  logger.info('created emr application applicationId:' + applicationId);

  logger.info('s3Bucket:' + s3Bucket + ', appIdKey:' + appIdKey);
  let appIdConfig = await readS3ObjectAsJson(s3Bucket, appIdKey);
  const nowStr = process.env.TEST_TIME_NOW_STR ?? new Date().toISOString();

  if (appIdConfig) {
    logger.info('find appIdConfig', { appIdConfig: appIdConfig });
    // only save previous 5 appIds
    const applicationIds = appIdConfig.applicationIds.slice(-5);
    // delete old one
    for (const appInfo of applicationIds) {
      await deleteEMRServerlessAppById(appInfo.applicationId);
    }
    applicationIds.push({
      applicationId,
      createAt: nowStr,
    });
    appIdConfig.applicationIds = applicationIds;
  } else {
    logger.info('not find appIdConfig');
    appIdConfig = {
      applicationIds: [
        {
          applicationId,
          createAt: nowStr,
        },
      ],
    };
  }

  logger.info('save new appIdConfig', appIdConfig);
  await putStringToS3(JSON.stringify(appIdConfig), s3Bucket, appIdKey);
  return applicationId;
}

async function deleteEMRServerlessApp() {
  const appIdConfig = await readS3ObjectAsJson(s3Bucket, appIdKey);
  if (appIdConfig) {
    logger.info('find appIdConfig', { appIdConfig: appIdConfig });
    const applicationIds = appIdConfig.applicationIds;
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

function compareVersions(version1: string, version2: string) {
  // Remove non-numeric prefix
  version1 = version1.replace(/^[^\d]+/, '');
  version2 = version2.replace(/^[^\d]+/, '');

  // Split version strings into parts
  const parts1 = version1.split('.');
  const parts2 = version2.split('.');

  // Compare each part
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parseInt(parts1[i] || '0', 10);
    const part2 = parseInt(parts2[i] || '0', 10);

    if (part1 !== part2) {
      return part1 - part2;
    }
  }
  return 0;
}



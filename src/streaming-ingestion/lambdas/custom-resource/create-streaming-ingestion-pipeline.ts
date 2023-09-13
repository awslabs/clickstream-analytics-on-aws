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

import { ApplicationStatus } from '@aws-sdk/client-kinesis-analytics-v2';
import { CdkCustomResourceHandler, CdkCustomResourceEvent, CdkCustomResourceResponse, CloudFormationCustomResourceEvent, Context, CloudFormationCustomResourceUpdateEvent } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { getS3Client, getS3ObjectStatusWithWait } from '../../../common/s3-asset';
import { KINESIS_KEY_ID } from '../../common/constant';
import { getFlinkApplicationName, getSinkStreamName, splitString } from '../../common/utils';
import { StreamingIngestionKinesisDataAnalyticsProps, StreamingIngestionPipelineCustomResourceProps } from '../../pipeline/model';
import { attachRolePolicy, getIAMClient, getRoleName } from '../iam';
import { createKinesisAnalyticsApplication, delKinesisAnalyticsApplication, describeKinesisAnalyticsApplication, getKinesisAnalyticsClient, startKinesisAnalyticsApplication, stopKinesisAnalyticsApplication } from '../kinesis-data-analytics';
import { createKinesisDataStream, delKinesisDataStream, descKinesisDataStream, getKinesisClient } from '../kinesis-data-stream';

export type ResourcePropertiesType = StreamingIngestionPipelineCustomResourceProps & {
  readonly ServiceToken: string;
}

export const handler: CdkCustomResourceHandler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  const response: CdkCustomResourceResponse = {
    PhysicalResourceId: 'create-streaming-ingestion-pipeline-custom-resource',
    Data: {
    },
    Status: 'SUCCESS',
  };

  try {
    await _handler(event, context);
  } catch (e) {
    if (e instanceof Error) {
      logger.error('Error when creating streaming ingestion pipeline', e);
    }
    throw e;
  }
  return response;
};

async function _handler(event: CdkCustomResourceEvent, context: Context) {
  const requestType = event.RequestType;

  logger.info('RequestType: ' + requestType + ' ' + context.awsRequestId);
  if (requestType == 'Create') {
    await onCreate(event);
  }

  if (requestType == 'Update') {
    await onUpdate(event);
  }

  if (requestType == 'Delete') {
    await onDelete(event);
  }
}

async function onCreate(event: CdkCustomResourceEvent) {
  const props = event.ResourceProperties as ResourcePropertiesType;
  logger.info('onCreate()', { props });

  // 1. create kinesis data streams for streaming ingestion
  await createStreamingIngestionPipelineByApps(props);

}

async function onUpdate(event: CloudFormationCustomResourceUpdateEvent) {
  logger.info(`onUpdate(${event})`);

  const oldProps = event.OldResourceProperties as ResourcePropertiesType;
  const props = event.ResourceProperties as ResourcePropertiesType;

  await updateKinesisDataStream(props, oldProps);

}

async function onDelete(event: CdkCustomResourceEvent) {
  logger.info('onDelete()' + event.RequestType);
  const props = event.ResourceProperties as ResourcePropertiesType;
  await delStreamingIngestionPipelineByApps(props);
}

async function createStreamingIngestionPipelineByApps(props: ResourcePropertiesType) {
  const projectId = props.projectId;
  const appIds = splitString(props.appIds);
  const stackShortId = props.stackShortId;
  logger.info(`projectId=${projectId},appIds=${appIds},stackShortId=${stackShortId}`);

  const kinesisClient = getKinesisClient(props.streamingIngestionPipelineRoleArn);
  const kinesisAnalyticsClient = getKinesisAnalyticsClient(props.streamingIngestionPipelineRoleArn);
  const s3Client = getS3Client(props.streamingIngestionPipelineRoleArn);

  const resources = [];
  for (const app of appIds) {
    const streamName = getSinkStreamName(projectId, app, stackShortId);
    logger.info('streamName:', streamName);
    const streamArn = await createKinesisDataStream(kinesisClient, streamName,
      KINESIS_KEY_ID, props.onDemandKinesisProps, props.provisionedKinesisProps);
    resources.push(streamArn);
    await getS3ObjectStatusWithWait(s3Client, props.applicationCodeBucketARN, props.applicationCodeFileKey);

    const flinkAppProps: StreamingIngestionKinesisDataAnalyticsProps = {
      projectId: props.projectId,
      appId: app,
      applicationName: getFlinkApplicationName(projectId, app, stackShortId),
      parallelism: props.parallelism,
      parallelismPerKPU: props.parallelismPerKPU,
      kinesisSourceStreamName: props.kinesisSourceStreamName,
      kinesisSinkStreamName: streamName,
      applicationCodeBucketARN: props.applicationCodeBucketARN,
      applicationCodeFileKey: props.applicationCodeFileKey,
      roleArn: props.streamingIngestionPipelineRoleArn,
      securityGroupIds: props.securityGroupIds,
      subnetIds: props.subnetIds,
      logStreamArn: props.logStreamArn,
    };
    await createKinesisAnalyticsApplication(kinesisAnalyticsClient, flinkAppProps);
    const descResponse = await describeKinesisAnalyticsApplication(kinesisAnalyticsClient, flinkAppProps.applicationName);
    if (descResponse.status != ApplicationStatus.READY) {
      throw new Error('describeKinesisAnalyticsApplication got ' + flinkAppProps.applicationName + ' invalid status:' + descResponse.status);
    }
    await startKinesisAnalyticsApplication(kinesisAnalyticsClient, flinkAppProps);
  };

  if (resources.length > 0) {
    await updateAssociateRedshiftRolePolicy(props.streamingIngestionAssociateRedshiftRoleArn,
      'streaming-ingestion-associate-redshift-policy-'+stackShortId, props.streamingIngestionPipelineRoleArn, resources);
  }
}

async function updateKinesisDataStream(props: ResourcePropertiesType, oldProps: ResourcePropertiesType) {
  logger.info(`doUpdate(${props},${oldProps})`);
  const appUpdateProps = getAppUpdateProps(props, oldProps);

  const projectId = props.projectId;
  const stackShortId = props.stackShortId;

  const kinesisClient = getKinesisClient(props.streamingIngestionPipelineRoleArn);
  const kinesisAnalyticsClient = getKinesisAnalyticsClient(props.streamingIngestionPipelineRoleArn);
  const s3Client = getS3Client(props.streamingIngestionPipelineRoleArn);

  const resources = [];
  for (const app of appUpdateProps.createAppIds) {
    const streamName = getSinkStreamName(projectId, app, stackShortId);
    logger.info('streamName:', streamName);
    const streamArn = await createKinesisDataStream(kinesisClient, streamName,
      KINESIS_KEY_ID, props.onDemandKinesisProps, props.provisionedKinesisProps);
    resources.push(streamArn);
    await getS3ObjectStatusWithWait(s3Client, props.applicationCodeBucketARN, props.applicationCodeFileKey);

    const flinkAppProps: StreamingIngestionKinesisDataAnalyticsProps = {
      projectId: props.projectId,
      appId: app,
      applicationName: getFlinkApplicationName(projectId, app, stackShortId),
      parallelism: props.parallelism,
      parallelismPerKPU: props.parallelismPerKPU,
      kinesisSourceStreamName: props.kinesisSourceStreamName,
      kinesisSinkStreamName: streamName,
      applicationCodeBucketARN: props.applicationCodeBucketARN,
      applicationCodeFileKey: props.applicationCodeFileKey,
      roleArn: props.streamingIngestionPipelineRoleArn,
      securityGroupIds: props.securityGroupIds,
      subnetIds: props.subnetIds,
      logStreamArn: props.logStreamArn,
    };
    await createKinesisAnalyticsApplication(kinesisAnalyticsClient, flinkAppProps);
    const descResponse = await describeKinesisAnalyticsApplication(kinesisAnalyticsClient, flinkAppProps.applicationName);
    if (descResponse.status != ApplicationStatus.READY) {
      throw new Error('describeKinesisAnalyticsApplication got ' + flinkAppProps.applicationName + ' invalid status:' + descResponse.status);
    }
    await startKinesisAnalyticsApplication(kinesisAnalyticsClient, flinkAppProps);
  };
  if (resources.length > 0) {
    for (const app of appUpdateProps.updateAppIds) {
      const streamArn = await descKinesisDataStream(kinesisClient, getSinkStreamName(projectId, app, stackShortId));
      resources.push(streamArn);
    }
    await updateAssociateRedshiftRolePolicy(props.streamingIngestionAssociateRedshiftRoleArn,
      'streaming-ingestion-associate-redshift-policy-'+stackShortId, props.streamingIngestionPipelineRoleArn, resources);
  }
}

async function delStreamingIngestionPipelineByApps(props: ResourcePropertiesType) {
  const projectId = props.projectId;
  const appIds = splitString(props.appIds);
  const stackShortId = props.stackShortId;

  const kinesisClient = getKinesisClient(props.streamingIngestionPipelineRoleArn);
  const kinesisAnalyticsClient = getKinesisAnalyticsClient(props.streamingIngestionPipelineRoleArn);
  for (const app of appIds) {
    try {
      const applicationName = getFlinkApplicationName(projectId, app, stackShortId);
      await stopKinesisAnalyticsApplication(kinesisAnalyticsClient, applicationName);
      const descResponse = await describeKinesisAnalyticsApplication(kinesisAnalyticsClient, applicationName);
      if (descResponse.status != ApplicationStatus.READY) {
        throw new Error('describeKinesisAnalyticsApplication got ' + applicationName + ' invalid status:' + descResponse.status);
      }
      await delKinesisAnalyticsApplication(kinesisAnalyticsClient, applicationName, descResponse.createTimestamp!);
    } catch (err) {
      if (err instanceof Error) {
        logger.error('Error when stopKinesisAnalyticsApplication', err);
      }
    }
    try {
      const streamName = getSinkStreamName(projectId, app, stackShortId);
      await delKinesisDataStream(kinesisClient, streamName);
    } catch (err) {
      if (err instanceof Error) {
        logger.error('Error when delKinesisDataStream', err);
      }
    }
  }
}

export type AppUpdateProps = {
  createAppIds: string[];
  updateAppIds: string[];
}

function getAppUpdateProps(props: ResourcePropertiesType, oldProps: ResourcePropertiesType): AppUpdateProps {

  const oldAppIdArray: string[] = [];
  if ( oldProps.appIds.trim().length > 0 ) {
    oldAppIdArray.push(...oldProps.appIds.trim().split(','));
  };

  const appIdArray: string[] = [];
  if ( props.appIds.trim().length > 0 ) {
    appIdArray.push(...props.appIds.trim().split(','));
  };

  logger.info(`props.appIds: ${props.appIds}`);
  logger.info(`oldProps.appIds: ${oldProps.appIds}`);
  logger.info(`appIdArray: ${appIdArray}`);
  logger.info(`oldAppIdArray: ${oldAppIdArray}`);

  const needCreateAppIds = appIdArray.filter(item => !oldAppIdArray.includes(item));
  logger.info(`apps need to be create: ${needCreateAppIds}`);

  const needUpdateAppIds = appIdArray.filter(item => oldAppIdArray.includes(item));
  logger.info(`apps need to be update: ${needUpdateAppIds}`);

  return {
    createAppIds: needCreateAppIds,
    updateAppIds: needUpdateAppIds,
  };

}

async function updateAssociateRedshiftRolePolicy(roleArn: string,
  policyName: string,
  streamingIngestionPipelineRoleArn: string, resources: string[]) {
  const iamClient = getIAMClient(streamingIngestionPipelineRoleArn);
  const associateRolePolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'ReadStream',
        Effect: 'Allow',
        Action: [
          'kinesis:DescribeStreamSummary',
          'kinesis:GetShardIterator',
          'kinesis:GetRecords',
          'kinesis:DescribeStream',
        ],
        Resource: resources,
      },
      {
        Sid: 'ListStream',
        Effect: 'Allow',
        Action: [
          'kinesis:ListStreams',
          'kinesis:ListShards',
        ],
        Resource: '*',
      },
    ],
  };
  await attachRolePolicy(iamClient,
    getRoleName(roleArn), policyName, JSON.stringify(associateRolePolicy));
}
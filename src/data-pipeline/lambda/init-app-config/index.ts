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

import { logger } from '@aws/clickstream-base-lib';
import { Context, CloudFormationCustomResourceEvent } from 'aws-lambda';
import { CATEGORY_RULE } from './traffic_source_category_rule_v1';
import { CHANNEL_RULE } from './traffic_source_channel_rule_v1';
import { TRAFFIC_SOURCE_CATEGORY_RULE_FILE_NAME, TRAFFIC_SOURCE_CHANNEL_RULE_FILE_NAME } from '../../../base-lib/src';
import { isObjectExist, putStringToS3 } from '../../../common/s3';
import { getRuleConfigDir } from '../../data-pipeline';

exports.handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  logger.info('event', { event, context });

  if (event.RequestType === 'Delete') {
    return;
  }
  const config = {
    projectId: process.env.PROJECT_ID!,
    pipelineS3BucketName: process.env.PIPELINE_S3_BUCKET_NAME!,
    pipelineS3Prefix: process.env.PIPELINE_S3_PREFIX!,
    appIds: process.env.APP_IDS!,
  };

  if (config.appIds === '') {
    logger.warn('appIds is empty');
    return;
  }

  const ruleConfigDir = getRuleConfigDir(config.pipelineS3Prefix, config.projectId);
  const ruleConfigDirS3 = `s3://${config.pipelineS3BucketName}/${ruleConfigDir}`;
  logger.info('ruleConfigDirS3', { ruleConfigDirS3 });

  await putInitRuleConfig(ruleConfigDirS3, config.appIds);

};

async function putInitRuleConfig(ruleConfigDir: string, appIds: string) {
  logger.info('putInitRuleConfig', { ruleConfigDir, appIds });

  const categoryRuleFile = `${TRAFFIC_SOURCE_CATEGORY_RULE_FILE_NAME}`;
  const channelRuleFile = `${TRAFFIC_SOURCE_CHANNEL_RULE_FILE_NAME}`;

  const categoryRuleContent = JSON.stringify(CATEGORY_RULE);
  const channelRuleContent = JSON.stringify(CHANNEL_RULE);

  const d = new RegExp(/s3:\/\/([^/]+)\/(.*)/).exec(ruleConfigDir);

  if (!d) {
    logger.error('putInitRuleConfig invalid s3 uri ' + ruleConfigDir);
    return;
  }

  const bucket = d[1];
  let keyPrefix = d[2];
  if (keyPrefix && !keyPrefix.endsWith('/')) {
    keyPrefix += '/';
  }

  for (const appId of appIds.split(',')) {
    const categoryRuleKey = `${keyPrefix}${appId}/${categoryRuleFile}`;
    const channelRuleKey = `${keyPrefix}${appId}/${channelRuleFile}`;

    if (! await isObjectExist(bucket, categoryRuleKey)) {
      await putStringToS3(categoryRuleContent, bucket, categoryRuleKey);
      logger.info(`put category rule config to s3://${bucket}/${categoryRuleKey}`);
    }
    if (! await isObjectExist(bucket, channelRuleKey)) {
      await putStringToS3(channelRuleContent, bucket, channelRuleKey);
      logger.info(`put channel rule config to s3://${bucket}/${channelRuleKey}`);
    }
  }
}

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

import { aws_sdk_client_common_config } from '@aws/clickstream-base-lib';
import { KinesisAnalyticsV2 } from '@aws-sdk/client-kinesis-analytics-v2';
import { logger } from '../../common/powertools';


export const updateFlinkApplicationEnvironmentProperties = async (
  region: string, applicationName: string, streamAppIds: string[],
) => {
  const kinesisAnalytics = new KinesisAnalyticsV2({
    ...aws_sdk_client_common_config,
    region,
  });
  try {
    const flinkApplication = await kinesisAnalytics.describeApplication({
      ApplicationName: applicationName,
    });
    const propertyGroupDescriptions =
      flinkApplication.ApplicationDetail?.ApplicationConfigurationDescription?.EnvironmentPropertyDescriptions?.PropertyGroupDescriptions;
    const appIdStreamListStr = JSON.stringify({
      appIdStreamList: streamAppIds,
    });
    for (const propertyGroup of propertyGroupDescriptions || []) {
      if (propertyGroup.PropertyGroupId === 'EnvironmentProperties' && propertyGroup.PropertyMap) {
        propertyGroup.PropertyMap.appIdStreamConfig = appIdStreamListStr;
        break;
      }
    }
    await kinesisAnalytics.updateApplication({
      ApplicationName: applicationName,
      CurrentApplicationVersionId: flinkApplication.ApplicationDetail?.ApplicationVersionId,
      ApplicationConfigurationUpdate: {
        EnvironmentPropertyUpdates: {
          PropertyGroups: propertyGroupDescriptions,
        },
      },
    });
    return true;
  } catch (error) {
    logger.error(`Failed to update Flink application environment properties: ${error}`);
    return false;
  }
};

export const startFlinkApplication = async (region: string, applicationName: string) => {
  const kinesisAnalytics = new KinesisAnalyticsV2({
    ...aws_sdk_client_common_config,
    region,
  });
  try {
    await kinesisAnalytics.startApplication({
      ApplicationName: applicationName,
    });
    return true;
  } catch (error) {
    logger.error(`Failed to start Flink application: ${error}`);
    return false;
  }
};

export const stopFlinkApplication = async (region: string, applicationName: string) => {
  const kinesisAnalytics = new KinesisAnalyticsV2({
    ...aws_sdk_client_common_config,
    region,
  });
  try {
    await kinesisAnalytics.stopApplication({
      ApplicationName: applicationName,
    });
    return true;
  } catch (error) {
    logger.error(`Failed to stop Flink application: ${error}`);
    return false;
  }
};

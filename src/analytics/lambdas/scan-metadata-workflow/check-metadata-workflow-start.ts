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

import { logger } from '../../../common/powertools';
import { readS3ObjectAsJson } from '../../../common/s3';
import { getLatestEmrJobEndTime } from '../../../data-pipeline/utils/utils-common';
import { WorkflowStatus } from '../../private/constant';

const pipelineS3BucketName = process.env.PIPELINE_S3_BUCKET_NAME!;
const pipelineS3Prefix = process.env.PIPELINE_S3_PREFIX!;
const projectId = process.env.PROJECT_ID!;

export interface CheckMetadataWorkflowEvent {
  eventSource: string;
  scanStartDate: string;
  scanEndDate: string;
}

/**
 * The lambda function submit a SQL statement to scan metadata.
 * @param event CheckMetadataWorkflowEvent, the JSON format is as follows:
 {
    "eventSource" : "LoadDataFlow",
    "scanStartDate" : "2023-10-25",
    "scanEndDate" : "2023-10-30",
  }
  @returns as follows:
  {
    status: WorkflowStatus,
    scanEndDate: scanEndDate,
    jobStartTimestamp: currentTimestamp,
    scanStartDate: startScanDate,
  };
 */
export const handler = async (event: CheckMetadataWorkflowEvent) => {
  logger.debug('request event:', JSON.stringify(event));
  try {
    const eventSource = event.eventSource;
    // workflow is triggered from upstream workflow
    if (eventSource === 'LoadDataFlow') {
      return await handleEventFromUpstreamWorkflow();
    } else {
      const inputScanEndDate = formatScanDate(event.scanEndDate);
      const inputScanStartDate = formatScanDate(event.scanStartDate);
      const currentTimestamp = Date.now();
      const scanEndDate = getScanEndDate(inputScanEndDate, getDateFromTimestamp(currentTimestamp));
      let scanStartDate = inputScanStartDate;
      return {
        status: WorkflowStatus.CONTINUE,
        scanEndDate: scanEndDate,
        jobStartTimestamp: currentTimestamp,
        scanStartDate: scanStartDate,
      };
    }
  } catch (err) {
    if (err instanceof Error) {
      logger.error('Error when scan metadata.', err);
    }
    throw err;
  }
};

async function handleEventFromUpstreamWorkflow() {
  const currentTimestamp = Date.now();
  const scanEndDate = await getMaxScanEndDate();
  const response = await getWorkflowInfoFromS3();
  let result = {};
  if (response) {
    const lastJobStartTimestamp = response.lastJobStartTimestamp;
    const startScanDate = response.lastScanEndDate;

    // Triggered if more than 24 hours have passed since the last job execution
    const workflowMinInterval = parseInt(process.env.WORKFLOW_MIN_INTERVAL || '1440');
    if (!lastJobStartTimestamp || currentTimestamp - lastJobStartTimestamp >= workflowMinInterval * 60 * 1000) {
      result = {
        status: WorkflowStatus.CONTINUE,
        scanEndDate: scanEndDate,
        jobStartTimestamp: currentTimestamp,
        scanStartDate: startScanDate,
      };
    } else {
      result = {
        status: WorkflowStatus.SKIP,
      };
    }
  } else {
    // first time to execution, no job info in ddb.
    result = {
      status: WorkflowStatus.CONTINUE,
      scanEndDate: scanEndDate,
      jobStartTimestamp: currentTimestamp,
      scanStartDate: '',
    };
  }
  return result;
}

async function getWorkflowInfoFromS3() {
  try {
    const s3Key = getWorkflowInfoKey(pipelineS3Prefix, projectId);

    return await readS3ObjectAsJson(
      pipelineS3BucketName,
      s3Key,
    );
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error get workflow info data from s3:', error);
    }
    throw error;
  }
}

// get latest date from emr ods job file
async function getMaxScanEndDate() {
  try {
    const latestJobTimestamp = await getLatestEmrJobEndTime(pipelineS3BucketName, pipelineS3Prefix, projectId);
    let maxScanEndDate = undefined;
    if (latestJobTimestamp) {
      logger.info(`found emr latest job timestamp: ${latestJobTimestamp}`);
      maxScanEndDate = getDateFromTimestamp(latestJobTimestamp);
    }

    if (!maxScanEndDate) {
      maxScanEndDate = getDateFromTimestamp(Date.now());
    }
    return maxScanEndDate;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error determining scan end date:', error);
    }
    throw error;
  }
}

function getDateFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}

function getScanEndDate(inputScanStartDate: string, maxScanStartDate: string) {
  if (!inputScanStartDate) {
    return maxScanStartDate;
  }

  const inputDate = new Date(inputScanStartDate);
  const maxDate = new Date(maxScanStartDate);

  return inputDate < maxDate ? inputScanStartDate : maxScanStartDate;
}

function formatScanDate(inputScanDate: string) {
  if (!inputScanDate) {
    return '';
  } else if (!isValidDateFormat(inputScanDate)) {
    throw new Error('input scan date format is not yyyy-mm-dd');
  } else {
    return inputScanDate;
  }
}

// check dateString is 'yyyy-mm-dd'
function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
}

export function getWorkflowInfoKey(s3Prefix: string, inputProjectId: string) {
  return `${s3Prefix}scan-metadata-job-info/${inputProjectId}/workflow-job-info.json`;
}
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

import { EventBridgeEvent, SQSEvent } from 'aws-lambda';
import { CloudFormationStackStatusChangeNotificationEventDetail, describeStack, getNewStackDetails, getPipeline, getPipelineIdFromStackName, getWorkflowStacks, updatePipelineStackStatus } from './listen-tools';
import { logger } from '../../../../common/powertools';

export const handler = async (event: SQSEvent): Promise<void> => {
  const eventBody = event.Records[0].body;
  const eventBridgeEvent = JSON.parse(eventBody) as EventBridgeEvent<'CloudFormation Stack Status Change', CloudFormationStackStatusChangeNotificationEventDetail>;
  const eventDetail = eventBridgeEvent.detail;
  const region = eventBridgeEvent.region;
  const stackId = eventDetail['stack-id'];
  const stackName = stackId.split('/')[1];

  if (!stackName.startsWith('Clickstream')) {
    return;
  }
  const stackDetail = await describeStack(stackId, region);
  if (!stackDetail) {
    logger.error('Failed to describe stack: ', { stackId, region });
    throw new Error('Failed to describe stack');
  }
  if (stackDetail.ParentId) {
    return;
  }
  logger.info('Detail: ', { stackName: stackName, status: stackDetail.StackStatus });

  const pipelineId = getPipelineIdFromStackName(stackName);
  const pipeline = await getPipeline(pipelineId);
  if (!pipeline) {
    logger.error('Failed to get pipeline by pipelineId: ', { pipelineId });
    throw new Error('Failed to get pipeline');
  }

  const projectId = pipeline.projectId;
  const stackNames = getWorkflowStacks(pipeline.workflow.Workflow);
  const newStackDetails = getNewStackDetails(stackDetail, pipeline.stackDetails ?? [], stackNames);
  await updatePipelineStackStatus(projectId, pipelineId, newStackDetails, pipeline.updateAt);
};

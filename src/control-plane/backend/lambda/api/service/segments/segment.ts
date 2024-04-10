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
  CLICKSTREAM_SEGMENTS_CRON_JOB_RULE_PREFIX,
  OUTPUT_USER_SEGMENTS_WORKFLOW_ARN_SUFFIX,
  Segment,
  SegmentDdbItem,
  SegmentJobStatus,
  SegmentJobTriggerType,
} from '@aws/clickstream-base-lib';
import {
  DeleteRuleCommand,
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
} from '@aws-sdk/client-eventbridge';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UserSegmentsSql } from './user-segments-sql';
import { PipelineStackType } from '../../common/model-ln';
import { logger } from '../../common/powertools';
import { aws_sdk_client_common_config } from '../../common/sdk-client-config-ln';
import { ApiFail, ApiSuccess, BucketPrefix } from '../../common/types';
import { getBucketPrefix } from '../../common/utils';
import { CPipeline } from '../../model/pipeline';
import { DynamoDBSegmentStore } from '../../store/dynamodb/dynamodb-segment-store';
import { DynamoDbStore } from '../../store/dynamodb/dynamodb-store';

const segmentStore = new DynamoDBSegmentStore();
const pipelineStore = new DynamoDbStore();

const API_FUNCTION_LAMBDA_ROLE = process.env.API_FUNCTION_LAMBDA_ROLE;
export const SEGMENT_JOBS_LIST_LIMIT = 30;

export class SegmentServ {
  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      const segment = this.constructSegmentFromInput(req, res);

      // Construct segment sql query
      const userSegmentsSql = new UserSegmentsSql(segment);
      segment.sql = userSegmentsSql.buildCriteriaStatement();

      // Create EventBridge rule
      if (segment.refreshSchedule.cron !== 'Manual' && !!segment.refreshSchedule.cronExpression) {
        const rule = await this.putEventBridgeRule(segment);
        segment.eventBridgeRuleArn = rule.RuleArn;
      }

      // Save segment setting to DDB
      const id = await segmentStore.create(segment);
      logger.info('Create new segment setting, id: ' + id);

      return res.status(201).json(new ApiSuccess({ id }, 'Segment created successfully.'));
    } catch (error) {
      return next(error);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { appId } = req.query;
      const segments = await segmentStore.list(appId as string);

      return res.status(200).json(new ApiSuccess(segments));
    } catch (error) {
      return next(error);
    }
  }

  public async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { appId } = req.query;
      const { segmentId } = req.params;
      const segment = await segmentStore.get(appId as string, segmentId as string);

      return res.status(200).json(new ApiSuccess(segment));
    } catch (error) {
      return next(error);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        segmentId,
        name,
        description,
        appId,
        refreshSchedule,
        criteria,
        eventBridgeRuleArn,
      } = req.body;
      const segmentDdbItem = await segmentStore.get(appId as string, segmentId as string);
      if (segmentDdbItem === undefined) {
        return res.status(400).send(new ApiFail(`Segment with id ${segmentId} is not found`));
      }

      const updatedItem = {
        ...segmentDdbItem,
        name,
        description,
        lastUpdateBy: res.get('X-Click-Stream-Operator') ?? 'Unknown operator',
        lastUpdateAt: Date.now(),
        refreshSchedule,
        criteria,
        eventBridgeRuleArn,
      };

      // Update EventBridge rule
      if (refreshSchedule.cron !== 'Manual' && !!refreshSchedule.cronExpression) {
        const rule = await this.putEventBridgeRule(updatedItem as Segment);
        updatedItem.eventBridgeRuleArn = rule.RuleArn;
      }
      // Clean up EventBridge rule when cron type is set to Manual
      if (refreshSchedule.cron === 'Manual' && segmentDdbItem.eventBridgeRuleArn !== '') {
        await this.deleteEventBridgeRule(segmentDdbItem.projectId, segmentId);
        updatedItem.eventBridgeRuleArn = '';
      }

      // Save segment setting to DDB
      const id = await segmentStore.update(updatedItem as SegmentDdbItem);
      logger.info('Update segment setting id: ' + id);

      return res.status(201).json(new ApiSuccess({ id }, 'Segment updated successfully.'));
    } catch (error) {
      return next(error);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { segmentId } = req.params;
      const { appId } = req.query;
      const segment = await segmentStore.get(appId as string, segmentId as string);
      if (!segment) {
        return res.status(400).send(new ApiFail(`Segment with id ${segmentId} is not found`));
      }

      // Clean up EventBridge rule
      if (segment.eventBridgeRuleArn !== '') {
        await this.deleteEventBridgeRule(segment.projectId, segmentId);
      }

      await segmentStore.delete(appId as string, segmentId as string);

      return res.status(200).send(new ApiSuccess({ segmentId }, 'Segment deleted successfully.'));
    } catch (error) {
      return next(error);
    }
  }

  public async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const { segmentId } = req.params;
      const segmentJobs = await segmentStore.listJobs(segmentId as string, SEGMENT_JOBS_LIST_LIMIT);

      return res.status(200).json(new ApiSuccess(segmentJobs));
    } catch (error) {
      return next(error);
    }
  }

  public async getSampleData(req: Request, res: Response, next: NextFunction) {
    try {
      const { segmentId } = req.params;
      const { jobRunId } = req.query;
      const sampleData = await segmentStore.getSampleData(segmentId as string, jobRunId as string | undefined);

      return res.status(200).json(new ApiSuccess(sampleData));
    } catch (error) {
      return next(error);
    }
  }

  public async refreshSegment(req: Request, res: Response, next: NextFunction) {
    try {
      const { appId } = req.query;
      const { segmentId } = req.params;
      const segment = await segmentStore.get(appId as string, segmentId as string);
      if (!segment) {
        return res.status(400).send(new ApiFail(`Segment with id ${segmentId} is not found`));
      }

      const workflowArn = await this.getSegmentsWorkflowSfnArn(segment as Segment);
      if (!workflowArn) {
        return res.status(400).send(new ApiFail('Segment workflow state machine is not found.'));
      }

      const sfnClient = await this.createSFNClient(segment.projectId);
      await sfnClient.send(new StartExecutionCommand({
        stateMachineArn: workflowArn,
        input: JSON.stringify({
          appId: appId,
          segmentId: segmentId,
          trigger: SegmentJobTriggerType.MANUALLY,
        }),
      }));

      return res.status(200).json(new ApiSuccess({ segmentId }, 'Run segment refresh job successfully.'));
    } catch (error) {
      return next(error);
    }
  }

  public async getExportS3Url(req: Request, res: Response, next: NextFunction) {
    try {
      const { segmentId, jobRunId } = req.params;
      const { projectId, appId } = req.query;
      const jobDetail = await segmentStore.getSampleData(segmentId as string, jobRunId as string | undefined);
      if (!jobDetail) {
        return res.status(400).send(new ApiFail(`Segment job status for segmentId: ${segmentId}, jobRunId: ${jobRunId} is not found.`));
      }
      if (jobDetail.jobStatus !== SegmentJobStatus.COMPLETED) {
        return res.status(400).send(new ApiFail(`Segment job for segmentId: ${segmentId}, jobRunId: ${jobRunId} is not in COMPLETED status.`));
      }

      const pipeline = await this.getPipeline(projectId as string);
      const s3Client = new S3Client({
        ...aws_sdk_client_common_config,
        region: pipeline.region,
      });

      // @ts-ignore https://github.com/aws/aws-sdk-js-v3/issues/4451
      const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: pipeline.bucket.name,
        Key: `${getBucketPrefix(projectId as string, BucketPrefix.SEGMENTS, pipeline.bucket.prefix ?? '')}app/${appId}/segment/${segmentId}/job/${jobRunId}/output.csv`,
      }), { expiresIn: 600 });

      return res.status(200).json(new ApiSuccess({ presignedUrl }, 'Generate presigned URL successfully.'));
    } catch (error) {
      return next(error);
    }
  }

  private constructSegmentFromInput(req: Request, res: Response): Segment {
    const now = Date.now();
    const input = req.body;
    const operator = res.get('X-Click-Stream-Operator') ?? 'Unknown operator';

    return {
      segmentId: uuidv4(),
      segmentType: input.segmentType,
      name: input.name,
      description: input.description ?? '',
      projectId: input.projectId,
      appId: input.appId,
      createBy: operator,
      createAt: now,
      lastUpdateBy: operator,
      lastUpdateAt: now,
      refreshSchedule: input.refreshSchedule,
      criteria: input.criteria,
      eventBridgeRuleArn: '',
      uiRenderingJson: input.uiRenderingJson ?? '',
    };
  }

  private async getPipeline(projectId: string) {
    const pipelines = await pipelineStore.listPipeline(projectId, 'latest', 'asc');
    if (pipelines.length === 0) {
      throw new Error(`Pipeline for ${projectId} is not found`);
    }

    return pipelines[0];
  }

  private async getPipelineRegion(projectId: string) {
    const pipeline = await this.getPipeline(projectId);

    return pipeline.region;
  }

  private async createEventBridgeClient(projectId: string) {
    const region = await this.getPipelineRegion(projectId);

    return new EventBridgeClient({
      ...aws_sdk_client_common_config,
      region,
    });
  }

  private async createSFNClient(projectId: string) {
    const region = await this.getPipelineRegion(projectId);

    return new SFNClient({
      ...aws_sdk_client_common_config,
      region,
    });
  }

  private async getSegmentsWorkflowSfnArn(segment: Segment) {
    const pipeline = new CPipeline(await this.getPipeline(segment.projectId));
    const outputs = pipeline.getStackOutputBySuffixes(PipelineStackType.DATA_MODELING_REDSHIFT, [
      OUTPUT_USER_SEGMENTS_WORKFLOW_ARN_SUFFIX,
    ]);

    return outputs.get(OUTPUT_USER_SEGMENTS_WORKFLOW_ARN_SUFFIX);
  }

  private async putEventBridgeRule(segment: Segment) {
    // Get segments workflow state machine arn
    const workflowArn = await this.getSegmentsWorkflowSfnArn(segment);
    if (!workflowArn) {
      throw new Error('Segment workflow state machine is not found.');
    }

    const eventBridgeClient = await this.createEventBridgeClient(segment.projectId);
    const ruleName = `${CLICKSTREAM_SEGMENTS_CRON_JOB_RULE_PREFIX}${segment.segmentId}`;
    const rule = await eventBridgeClient.send(new PutRuleCommand({
      Name: ruleName,
      Description: `For scheduled job of segment ${segment.name} (${segment.segmentId})`,
      ScheduleExpression: segment.refreshSchedule.cronExpression,
      State: segment.refreshSchedule.expireAfter > Date.now() ? 'ENABLED' : 'DISABLED',
    }));

    await eventBridgeClient.send(new PutTargetsCommand({
      Rule: ruleName,
      Targets: [
        {
          Arn: workflowArn,
          Id: 'SegmentsWorkflowStateMachine',
          Input: JSON.stringify({
            appId: segment.appId,
            segmentId: segment.segmentId,
            trigger: SegmentJobTriggerType.SCHEDULED,
          }),
          RoleArn: API_FUNCTION_LAMBDA_ROLE,
        },
      ],
    }));
    logger.info('Put EventBridge rule ' + ruleName);

    return rule;
  }

  private async deleteEventBridgeRule(projectId: string, segmentId: string) {
    const eventBridgeClient = await this.createEventBridgeClient(projectId);
    const ruleName = `${CLICKSTREAM_SEGMENTS_CRON_JOB_RULE_PREFIX}${segmentId}`;
    await eventBridgeClient.send(new RemoveTargetsCommand({
      Rule: ruleName,
      Ids: ['SegmentsWorkflowStateMachine'],
    }));

    await eventBridgeClient.send(new DeleteRuleCommand({
      Name: ruleName,
    }));

    logger.info('Clean up EventBridge rule ' + ruleName);
  }
}

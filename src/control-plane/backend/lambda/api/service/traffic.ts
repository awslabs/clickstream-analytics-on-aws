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

import { TRAFFIC_SOURCE_CATEGORY_RULE_FILE_NAME, TRAFFIC_SOURCE_CHANNEL_RULE_FILE_NAME } from '@aws/clickstream-base-lib';
import { PipelineServ } from './pipeline';
import { ApiSuccess } from '../common/types';
import { IPipeline } from '../model/pipeline';
import { ITrafficSource } from '../model/traffic';
import { putStringToS3, readS3ObjectAsJson } from '../store/aws/s3';

const pipelineServ: PipelineServ = new PipelineServ();

export class TrafficSourceServ {
  private _getTrafficSourceBucketKey(projectId: string, appId: string, type: string): string {
    if (type === 'ChannelGroups') {
      return `clickstream/${projectId}/rules/${appId}/${TRAFFIC_SOURCE_CHANNEL_RULE_FILE_NAME}`;
    }
    return `clickstream/${projectId}/rules/${appId}/${TRAFFIC_SOURCE_CATEGORY_RULE_FILE_NAME}`;
  }

  private _getTrafficSourceBucket(pipeline: IPipeline): string {
    return pipeline.dataProcessing?.pipelineBucket.name ?? pipeline?.bucket.name;
  }

  public async detail(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const pipeline = await pipelineServ.getPipelineByProjectId(projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiSuccess('The pipeline not found.'));
      }
      const channelGroups = await readS3ObjectAsJson(
        this._getTrafficSourceBucket(pipeline),
        this._getTrafficSourceBucketKey(projectId, appId, 'ChannelGroups'));
      const sourceCategories = await readS3ObjectAsJson(
        this._getTrafficSourceBucket(pipeline),
        this._getTrafficSourceBucketKey(projectId, appId, 'SourceCategories'));
      const trafficSource: ITrafficSource = {
        projectId: projectId,
        appId: appId,
        channelGroups: channelGroups,
        sourceCategories: sourceCategories,
      };
      return res.json(new ApiSuccess(trafficSource));
    } catch (error) {
      next(error);
    }
  };

  public async overwrite(req: any, res: any, next: any) {
    try {
      const trafficSource: ITrafficSource = {
        ...req.body,
      };
      const pipeline = await pipelineServ.getPipelineByProjectId(trafficSource.projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiSuccess('The pipeline not found.'));
      }
      await putStringToS3(
        this._getTrafficSourceBucket(pipeline),
        this._getTrafficSourceBucketKey(trafficSource.projectId, trafficSource.appId, 'ChannelGroups'),
        JSON.stringify(trafficSource.channelGroups));
      await putStringToS3(
        this._getTrafficSourceBucket(pipeline),
        this._getTrafficSourceBucketKey(trafficSource.projectId, trafficSource.appId, 'SourceCategories'),
        JSON.stringify(trafficSource.sourceCategories));
      return res.json(new ApiSuccess('OK'));
    } catch (error) {
      next(error);
    }
  };

}
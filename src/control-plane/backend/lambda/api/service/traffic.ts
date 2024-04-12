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
import { IChannelGroup, ISourceCategory, ITrafficSource, ITrafficSourceAction } from '../model/traffic';
import { putStringToS3, readS3ObjectAsJson } from '../store/aws/s3';

const pipelineServ: PipelineServ = new PipelineServ();


export enum ITrafficSourceType {
  CHANNEL = 'Channel',
  CATEGORY = 'Category',
};

export interface ITrafficSourceActionRequest {
  readonly action: ITrafficSourceAction;
  readonly projectId: string;
  readonly appId: string;
  readonly channelGroup?: IChannelGroup;
  readonly channelGroups?: IChannelGroup[];
  readonly sourceCategory?: ISourceCategory;
}

export class TrafficSourceServ {
  private _getTrafficSourceBucketKey(projectId: string, appId: string, type: ITrafficSourceType): string {
    if (type === ITrafficSourceType.CHANNEL) {
      return `clickstream/${projectId}/rules/${appId}/${TRAFFIC_SOURCE_CHANNEL_RULE_FILE_NAME}`;
    }
    return `clickstream/${projectId}/rules/${appId}/${TRAFFIC_SOURCE_CATEGORY_RULE_FILE_NAME}`;
  }

  private _getTrafficSourceBucket(pipeline: IPipeline): string {
    return pipeline.dataProcessing?.pipelineBucket.name ?? pipeline?.bucket.name;
  }

  private async _getTrafficSourceData(pipeline: IPipeline, appId: string, type: ITrafficSourceType): Promise<IChannelGroup[] | ISourceCategory[]> {
    const data = await readS3ObjectAsJson(
      this._getTrafficSourceBucket(pipeline),
      this._getTrafficSourceBucketKey(pipeline.projectId, appId, type),
    ) ?? [];
    return type === ITrafficSourceType.CHANNEL ? data as IChannelGroup[] : data as ISourceCategory[];
  }

  private async _saveTrafficSourceData(pipeline: IPipeline, appId: string, type: ITrafficSourceType, data: any): Promise<void> {
    await putStringToS3(
      JSON.stringify(data),
      pipeline.region,
      this._getTrafficSourceBucket(pipeline),
      this._getTrafficSourceBucketKey(pipeline.projectId, appId, type),
    );
  };

  public async detail(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const pipeline = await pipelineServ.getPipelineByProjectId(projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiSuccess('The pipeline not found.'));
      }
      const channelGroups = await this._getTrafficSourceData(pipeline, appId, ITrafficSourceType.CHANNEL);
      const sourceCategories = await this._getTrafficSourceData(pipeline, appId, ITrafficSourceType.CATEGORY);
      const trafficSource: ITrafficSource = {
        projectId: projectId,
        appId: appId,
        channelGroups: channelGroups as IChannelGroup[],
        sourceCategories: sourceCategories as ISourceCategory[],
      };
      return res.json(new ApiSuccess(trafficSource));
    } catch (error) {
      next(error);
    }
  };

  public async action(req: any, res: any, next: any) {
    try {
      const request: ITrafficSourceActionRequest = {
        ...req.body,
      };
      const pipeline = await pipelineServ.getPipelineByProjectId(request.projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiSuccess('The pipeline not found.'));
      }
      const type = (request.channelGroup || request.channelGroups) ? ITrafficSourceType.CHANNEL : ITrafficSourceType.CATEGORY;
      const data = await this._getTrafficSourceData(pipeline, request.appId, type);
      switch (request.action) {
        case ITrafficSourceAction.NEW:
          const newData = this._newItem(data, request.channelGroup ?? request.sourceCategory);
          await this._saveTrafficSourceData(pipeline, request.appId, type, newData);
          break;
        case ITrafficSourceAction.UPDATE:
          const updatedData = this._updateItem(data, request.channelGroup ?? request.sourceCategory, type);
          await this._saveTrafficSourceData(pipeline, request.appId, type, updatedData);
          break;
        case ITrafficSourceAction.DELETE:
          const deletedData = this._deleteItem(data, request.channelGroup ?? request.sourceCategory, type);
          await this._saveTrafficSourceData(pipeline, request.appId, type, deletedData);
          break;
        case ITrafficSourceAction.REORDER:
          await this._saveTrafficSourceData(pipeline, request.appId, type, request.channelGroups ?? data);
          break;
        default:
          break;
      };
      return res.json(new ApiSuccess('OK'));
    } catch (error) {
      next(error);
    }
  };

  public _newItem(data: any[], item: any): any[] {
    // unshift to the beginning of the array
    data.unshift(item);
    return data;
  }

  public _updateItem(data: any[], item: any, type: ITrafficSourceType): any {
    if (type === ITrafficSourceType.CHANNEL) {
      const index = (data as IChannelGroup[]).findIndex((i: any) => i.id === item.id);
      if (index > -1) {
        (data as IChannelGroup[])[index] = item as IChannelGroup;
      }
    } else {
      const index = (data as ISourceCategory[]).findIndex((i: any) => i.url === item.url);
      if (index > -1) {
        (data as ISourceCategory[])[index] = item as ISourceCategory;
      }
    }
    return data;
  }

  public _deleteItem(data: any[], item: any, type: ITrafficSourceType): any {
    if (type === ITrafficSourceType.CHANNEL) {
      return data.filter((i: any) => i.id !== item.id);
    }
    return data.filter((i: any) => i.url !== item.url);
  }

}
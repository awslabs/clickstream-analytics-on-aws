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

import { CMetadataDisplay } from './display';
import { PipelineServ } from './pipeline';
import { ApiFail, ApiSuccess } from '../common/types';
import { groupAssociatedEventParametersByName, groupByParameterByName, isNewMetadataVersion, pathNodesToAttribute } from '../common/utils';
import { IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';
import { DynamoDbMetadataStore } from '../store/dynamodb/dynamodb-metadata-store';
import { MetadataStore } from '../store/metadata-store';

const metadataStore: MetadataStore = new DynamoDbMetadataStore();
const metadataDisplay: CMetadataDisplay = new CMetadataDisplay();
const pipelineServ: PipelineServ = new PipelineServ();

export class MetadataEventServ {

  public async updateDisplay(req: any, res: any, next: any) {
    try {
      const { projectId, appId, id, displayName, description } = req.body;
      const result = await metadataDisplay.update({ id, projectId, appId, description, displayName } as IMetadataDisplay);
      if (!result) {
        res.json(new ApiFail('Updated failed.'));
      }
      return res.json(new ApiSuccess(null, 'Updated success.'));
    } catch (error) {
      next(error);
    }
  }

  public async listPathNodes(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const parameters = await metadataStore.listEventParameters(projectId, appId);
      const pageTitles: IMetadataEventParameter =
      parameters.find((p: IMetadataEventParameter) => p.eventName === '_page_view' && p.name === '_page_title') as IMetadataEventParameter;
      const pageUrls: IMetadataEventParameter =
      parameters.find((p: IMetadataEventParameter) => p.eventName === '_page_view' && p.name === '_page_url') as IMetadataEventParameter;
      const screenNames: IMetadataEventParameter =
      parameters.find((p: IMetadataEventParameter) => p.eventName === '_screen_view' && p.name === '_screen_name') as IMetadataEventParameter;
      const screenIds: IMetadataEventParameter =
      parameters.find((p: IMetadataEventParameter) => p.eventName === '_screen_view' && p.name === '_screen_id') as IMetadataEventParameter;

      return res.json(new ApiSuccess({
        pageTitles: pathNodesToAttribute(pageTitles?.valueEnum),
        pageUrls: pathNodesToAttribute(pageUrls?.valueEnum),
        screenNames: pathNodesToAttribute(screenNames?.valueEnum),
        screenIds: pathNodesToAttribute(screenIds?.valueEnum),
      }));
    } catch (error) {
      next(error);
    }
  };

  private async listRawEvents(projectId: string, appId: string, associated: boolean) {
    let rawEvents: IMetadataEvent[] = [];
    const pipeline = await pipelineServ.getPipelineByProjectId(projectId);
    if (!pipeline) {
      return rawEvents;
    }
    if (isNewMetadataVersion(pipeline)) {
      rawEvents = await metadataStore.listEventsV2(projectId, appId);
    } else {
      rawEvents = await metadataStore.listEvents(projectId, appId);
      if (associated) {
        const eventParameters = await metadataStore.listEventParameters(projectId, appId);
        rawEvents = groupAssociatedEventParametersByName(rawEvents, eventParameters);
      }
    }
    return rawEvents;
  }

  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId, attribute } = req.query;
      const associated = attribute && attribute === 'true';
      let events = await this.listRawEvents(projectId, appId, associated);
      events = await metadataDisplay.patch(projectId, appId, events) as IMetadataEvent[];
      return res.json(new ApiSuccess({
        totalCount: events.length,
        items: events,
      }));
    } catch (error) {
      next(error);
    }
  };

  private async getRawEvent(projectId: string, appId: string, name: string) {
    let event: IMetadataEvent | undefined;
    const pipeline = await pipelineServ.getPipelineByProjectId(projectId);
    if (!pipeline) {
      return event;
    }
    if (isNewMetadataVersion(pipeline)) {
      event = await metadataStore.getEventV2(projectId, appId, name);
    } else {
      event = await metadataStore.getEvent(projectId, appId, name);
      if (!event) {
        return event;
      }
      let eventParameters = await metadataStore.listEventParameters(projectId, appId);
      eventParameters = groupByParameterByName(eventParameters, name);
      event.associatedParameters = eventParameters.filter((r: IMetadataEventParameter) => r.eventName === name);
    }
    return event;
  }

  public async details(req: any, res: any, next: any) {
    try {
      const { name } = req.params;
      const { projectId, appId } = req.query;
      let event = await this.getRawEvent(projectId, appId, name);
      if (!event) {
        return res.status(404).json(new ApiFail('Event not found'));
      }
      event = (await metadataDisplay.patch(projectId, appId, [event]) as IMetadataEvent[])[0];
      return res.json(new ApiSuccess(event));
    } catch (error) {
      next(error);
    }
  };
}

export class MetadataEventParameterServ {
  private async listRawParameters(projectId: string, appId: string) {
    let rawEventParameters: IMetadataEventParameter[] = [];
    const pipeline = await pipelineServ.getPipelineByProjectId(projectId);
    if (!pipeline) {
      return rawEventParameters;
    }
    if (isNewMetadataVersion(pipeline)) {
      rawEventParameters = await metadataStore.listEventParametersV2(projectId, appId);
    } else {
      const results = await metadataStore.listEventParameters(projectId, appId);
      rawEventParameters = groupByParameterByName(results);
    }
    return rawEventParameters;
  }

  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const parameters = await this.listRawParameters(projectId, appId);
      const results = await metadataDisplay.patch(projectId, appId, parameters) as IMetadataEventParameter[];
      return res.json(new ApiSuccess({
        totalCount: results.length,
        items: results,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { projectId, appId, name, category, type } = req.query;
      let parameter = await metadataStore.getEventParameter(projectId, appId, name, category, type);
      if (!parameter) {
        return res.status(404).json(new ApiFail('Event attribute not found'));
      }
      parameter = (await metadataDisplay.patch(projectId, appId, [parameter]) as IMetadataEventParameter[])[0];
      return res.json(new ApiSuccess(parameter));
    } catch (error) {
      next(error);
    }
  };
}

export class MetadataUserAttributeServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const results = await metadataStore.listUserAttributes(projectId, appId);
      const attributes = await metadataDisplay.patch(projectId, appId, results) as IMetadataUserAttribute[];
      return res.json(new ApiSuccess({
        totalCount: attributes.length,
        items: attributes,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { projectId, appId, name, type } = req.query;
      let attribute = await metadataStore.getUserAttribute(projectId, appId, name, type);
      if (!attribute) {
        return res.status(404).json(new ApiFail('User attribute not found'));
      }
      attribute = (await metadataDisplay.patch(projectId, appId, [attribute]) as IMetadataUserAttribute[])[0];
      return res.json(new ApiSuccess(attribute));
    } catch (error) {
      next(error);
    }
  };

}
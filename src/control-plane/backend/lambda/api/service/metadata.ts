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
import { ApiFail, ApiSuccess } from '../common/types';
import { groupAssociatedEventParametersByName } from '../common/utils';
import { IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';
import { DynamoDbMetadataStore } from '../store/dynamodb/dynamodb-metadata-store';
import { MetadataStore } from '../store/metadata-store';

const metadataStore: MetadataStore = new DynamoDbMetadataStore();
const metadataDisplay: CMetadataDisplay = new CMetadataDisplay();

export class MetadataEventServ {

  public async updateDisplay(req: any, res: any, next: any) {
    try {
      const { projectId, appId, id, displayName, description } = req.body;
      const result = await metadataDisplay.update({ id, projectId, appId, description, displayName } as IMetadataDisplay);
      if (!result) {
        res.json(new ApiSuccess(null, 'Updated failed.'));
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
        pageTitles: pageTitles?.valueEnum ?? [],
        pageUrls: pageUrls?.valueEnum ?? [],
        screenNames: screenNames?.valueEnum ?? [],
        screenIds: screenIds?.valueEnum ?? [],
      }));
    } catch (error) {
      next(error);
    }
  };

  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId, attribute } = req.query;
      let events = await metadataStore.listEvents(projectId, appId);
      if (attribute && attribute === 'true') {
        const eventParameters = await metadataStore.listEventParameters(projectId, appId);
        events = groupAssociatedEventParametersByName(events, eventParameters);
      }
      events = await metadataDisplay.patch(projectId, appId, events) as IMetadataEvent[];
      return res.json(new ApiSuccess({
        totalCount: events.length,
        items: events,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { name } = req.params;
      const { projectId, appId } = req.query;
      let event = await metadataStore.getEvent(projectId, appId, name);
      if (!event) {
        return res.status(404).json(new ApiFail('Event not found'));
      }
      const eventParameters = await metadataStore.listEventParameters(projectId, appId);
      event.associatedParameters = eventParameters.filter((r: IMetadataEventParameter) => r.eventName === name);
      event = (await metadataDisplay.patch(projectId, appId, [event]) as IMetadataEvent[])[0];
      return res.json(new ApiSuccess(event));
    } catch (error) {
      next(error);
    }
  };
}

export class MetadataEventParameterServ {

  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      let results = await metadataStore.listEventParameters(projectId, appId);
      results = await metadataDisplay.patch(projectId, appId, results) as IMetadataEventParameter[];
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
      const { projectId, appId, name, type } = req.query;
      let parameter = await metadataStore.getEventParameter(projectId, appId, name, type);
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
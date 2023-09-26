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
import { groupAssociatedEventParametersByName, groupAssociatedEventsByName, groupEventByName, groupEventParameterByName, isEmpty } from '../common/utils';
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
      const pageView = await metadataStore.getEvent(projectId, appId, '_page_view');
      const screenView = await metadataStore.getEvent(projectId, appId, '_screen_view');
      const pageTitles: IMetadataEventParameter =
      pageView.find((r: any) => r.prefix.startsWith('EVENT_PARAMETER#') && r.name === '_page_title') as IMetadataEventParameter;
      const pageUrls: IMetadataEventParameter =
      pageView.find((r: any) => r.prefix.startsWith('EVENT_PARAMETER#') && r.name === '_page_url') as IMetadataEventParameter;
      const screenNames: IMetadataEventParameter =
      screenView.find((r: any) => r.prefix.startsWith('EVENT_PARAMETER#') && r.name === '_screen_name') as IMetadataEventParameter;
      const screenIds: IMetadataEventParameter =
      screenView.find((r: any) => r.prefix.startsWith('EVENT_PARAMETER#') && r.name === '_screen_id') as IMetadataEventParameter;
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
      const { projectId, appId, order, attribute } = req.query;
      let events = await metadataStore.listEvents(projectId, appId, order);
      events = groupEventByName(events);
      if (attribute && attribute === 'true') {
        const eventParameters = await metadataStore.listEventParameters(projectId, appId, order);
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

  public async add(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const event: IMetadataEvent = req.body;
      const name = await metadataStore.createEvent(event);
      return res.status(201).json(new ApiSuccess({ name }, 'Event created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { name } = req.params;
      const { projectId, appId } = req.query;
      const results = await metadataStore.getEvent(projectId, appId, name);
      if (isEmpty(results)) {
        return res.status(404).json(new ApiFail('Event not found'));
      }
      const events = results.filter((r: any) => r.prefix.startsWith('EVENT#')) as IMetadataEvent[];
      const parameters = results.filter((r: any) => r.prefix.startsWith('EVENT_PARAMETER#')) as IMetadataEventParameter[];
      let event = groupEventByName(events)[0];
      event = groupAssociatedEventParametersByName([event], parameters)[0];
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
      const { projectId, appId, order } = req.query;
      let results = await metadataStore.listEventParameters(projectId, appId, order);
      results = groupEventParameterByName(results);
      results = await metadataDisplay.patch(projectId, appId, results) as IMetadataEventParameter[];
      return res.json(new ApiSuccess({
        totalCount: results.length,
        items: results,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const eventParameter: IMetadataEventParameter = req.body;
      const id = await metadataStore.createEventParameter(eventParameter);
      return res.status(201).json(new ApiSuccess({ id }, 'Event attribute created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { parameterName } = req.params;
      const { projectId, appId } = req.query;
      const results = await metadataStore.getEventParameter(projectId, appId, parameterName);
      if (isEmpty(results)) {
        return res.status(404).json(new ApiFail('Event attribute not found'));
      }
      let parameter = groupEventParameterByName(results)[0];
      parameter.associatedEvents = groupAssociatedEventsByName(results);
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
      const { projectId, appId, order } = req.query;
      const results = await metadataStore.listUserAttributes(projectId, appId, order);
      const attributes = await metadataDisplay.patch(projectId, appId, results) as IMetadataUserAttribute[];
      return res.json(new ApiSuccess({
        totalCount: attributes.length,
        items: attributes,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const userAttribute: IMetadataUserAttribute = req.body;
      const id = await metadataStore.createUserAttribute(userAttribute);
      return res.status(201).json(new ApiSuccess({ id }, 'User attribute created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { name } = req.params;
      const { projectId, appId } = req.query;
      const results = await metadataStore.getUserAttribute(projectId, appId, name);
      if (isEmpty(results)) {
        return res.status(404).json(new ApiFail('User attribute not found'));
      }
      const attribute = (await metadataDisplay.patch(projectId, appId, [results[0]]) as IMetadataUserAttribute[])[0];
      return res.json(new ApiSuccess(attribute));
    } catch (error) {
      next(error);
    }
  };

}
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

import { v4 as uuidv4 } from 'uuid';
import { ApiFail, ApiSuccess } from '../common/types';
import { IMetadataEvent, IMetadataEventAttribute, IMetadataUserAttribute } from '../model/metadata';
import { DynamoDbMetadataStore } from '../store/dynamodb/dynamodb-metadata-store';
import { MetadataStore } from '../store/metadata-store';

const metadataStore: MetadataStore = new DynamoDbMetadataStore();

export class MetadataEventServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { order } = req.query;
      const result = await metadataStore.listEvents(order);
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: result,
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
      const result = await metadataStore.getEvent(name);
      if (!result) {
        return res.status(404).json(new ApiFail('Event not found'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const event: IMetadataEvent = req.body as IMetadataEvent;
      await metadataStore.updateEvent(event);
      return res.status(201).json(new ApiSuccess(null, 'Event updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const { name } = req.params;
      const operator = res.get('X-Click-Stream-Operator');
      await metadataStore.deleteEvent(name, operator);
      return res.json(new ApiSuccess(null, 'Event deleted.'));
    } catch (error) {
      next(error);
    }
  };

}

export class MetadataEventAttributeServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { order } = req.query;
      const result = await metadataStore.listEventAttributes(order);
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: result,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      req.body.id = uuidv4().replace(/-/g, '');
      const eventAttribute: IMetadataEventAttribute = req.body;
      const name = await metadataStore.createEventAttribute(eventAttribute);
      return res.status(201).json(new ApiSuccess({ name }, 'Event attribute created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const result = await metadataStore.getEventAttribute(id);
      if (!result) {
        return res.status(404).json(new ApiFail('Event attribute not found'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const eventAttribute: IMetadataEventAttribute = req.body as IMetadataEventAttribute;
      await metadataStore.updateEventAttribute(eventAttribute);
      return res.status(201).json(new ApiSuccess(null, 'Event attribute updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const operator = res.get('X-Click-Stream-Operator');
      await metadataStore.deleteEventAttribute(id, operator);
      return res.json(new ApiSuccess(null, 'Event attribute deleted.'));
    } catch (error) {
      next(error);
    }
  };

}

export class MetadataUserAttributeServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { order } = req.query;
      const result = await metadataStore.listUserAttributes(order);
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: result,
      }));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      req.body.id = uuidv4().replace(/-/g, '');
      const userAttribute: IMetadataUserAttribute = req.body;
      const name = await metadataStore.createUserAttribute(userAttribute);
      return res.status(201).json(new ApiSuccess({ name }, 'User attribute created.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const result = await metadataStore.getUserAttribute(id);
      if (!result) {
        return res.status(404).json(new ApiFail('User attribute not found'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      req.body.operator = res.get('X-Click-Stream-Operator');
      const userAttribute: IMetadataUserAttribute = req.body as IMetadataUserAttribute;
      await metadataStore.updateUserAttribute(userAttribute);
      return res.status(201).json(new ApiSuccess(null, 'User attribute updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const operator = res.get('X-Click-Stream-Operator');
      await metadataStore.deleteUserAttribute(id, operator);
      return res.json(new ApiSuccess(null, 'User attribute deleted.'));
    } catch (error) {
      next(error);
    }
  };

}
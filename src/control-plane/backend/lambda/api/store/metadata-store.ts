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

import { IMetadataEvent, IMetadataEventAttribute, IMetadataUserAttribute } from '../model/metadata';

export interface MetadataStore {
  createEvent: (event: IMetadataEvent) => Promise<string>;
  getEvent: (eventName: string) => Promise<any>;
  updateEvent: (event: IMetadataEvent) => Promise<void>;
  listEvents: (order: string) => Promise<IMetadataEvent[]>;
  deleteEvent: (eventName: string, operator: string) => Promise<void>;
  isEventExisted: (eventName: string) => Promise<boolean>;

  createEventAttribute: (eventAttribute: IMetadataEventAttribute) => Promise<string>;
  getEventAttribute: (eventAttributeId: string) => Promise<IMetadataEventAttribute | undefined>;
  updateEventAttribute: (eventAttribute: IMetadataEventAttribute) => Promise<void>;
  listEventAttributes: (order: string) => Promise<IMetadataEventAttribute[]>;
  deleteEventAttribute: (eventAttributeId: string, operator: string) => Promise<void>;
  isEventAttributeExisted: (eventAttributeId: string) => Promise<boolean>;

  createUserAttribute: (userAttribute: IMetadataUserAttribute) => Promise<string>;
  getUserAttribute: (userAttributeId: string) => Promise<IMetadataUserAttribute | undefined>;
  updateUserAttribute: (userAttribute: IMetadataUserAttribute) => Promise<void>;
  listUserAttributes: (order: string) => Promise<IMetadataUserAttribute[]>;
  deleteUserAttribute: (userAttributeId: string, operator: string) => Promise<void>;
  isUserAttributeExisted: (userAttributeId: string) => Promise<boolean>;
}

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

import { CloudFormationCustomResourceEvent } from 'aws-lambda';

type ResourcePropertiesType = {
  ServiceToken: string;
  [Key: string]: any;
}

function toAppIdArray(appIds?: string) {
  return (appIds === '' || !appIds) ? [] : appIds.split(',');
}

export function planAppChanges(event: CloudFormationCustomResourceEvent) {
  const toBeAdded: string[] = [], toBeUpdated: string[] = [], toBeDeleted: string[] = [];

  const props = event.ResourceProperties as ResourcePropertiesType;
  const requestType = event.RequestType;

  if (requestType == 'Create') {
    toAppIdArray(props.appIds).forEach(appId => { toBeAdded.push(appId); });
  }

  if (requestType == 'Update') {
    const oldProps = event.OldResourceProperties as ResourcePropertiesType;
    const oldAppIds = toAppIdArray(oldProps.appIds);
    const newAppIds = toAppIdArray(props.appIds);

    newAppIds.forEach(appId => {
      if (!oldAppIds.includes(appId)) { toBeAdded.push(appId); } else { toBeUpdated.push(appId); }
    });

    oldAppIds.forEach(appId => {
      if (!newAppIds.includes(appId)) { toBeDeleted.push(appId); }
    });
  }

  if (requestType == 'Delete') {
    toAppIdArray(props.appIds).forEach(appId => { toBeDeleted.push(appId); });
  }
  return { toBeAdded, toBeUpdated, toBeDeleted };
}
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
import { OUTPUT_SCAN_METADATA_WORKFLOW_ARN_SUFFIX } from '../common/constants-ln';
import { ConditionCategory, MetadataValueType } from '../common/explore-types';
import { MetadataVersionType, PipelineStackType } from '../common/model-ln';
import { ApiFail, ApiSuccess } from '../common/types';
import { groupAssociatedEventParametersByName, groupByParameterByName, getMetadataVersionType, pathNodesToAttribute, getLocalDateISOString, getStackOutputFromPipelineStatus } from '../common/utils';
import { IMetadataAttributeValue, IMetadataDisplay, IMetadataEvent, IMetadataEventParameter, IMetadataUserAttribute } from '../model/metadata';
import { startExecution } from '../store/aws/sfn';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbMetadataStore } from '../store/dynamodb/dynamodb-metadata-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';
import { MetadataStore } from '../store/metadata-store';

const metadataStore: MetadataStore = new DynamoDbMetadataStore();
const metadataDisplay: CMetadataDisplay = new CMetadataDisplay();
const pipelineServ: PipelineServ = new PipelineServ();
const clickStreamStore: ClickStreamStore = new DynamoDbStore();

const getVersionType = async (projectId: string) => {
  const pipeline = await pipelineServ.getPipelineByProjectId(projectId);
  if (!pipeline) {
    return MetadataVersionType.UNSUPPORTED;
  }
  return getMetadataVersionType(pipeline);
};
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

  private async listRawEvents(projectId: string, appId: string, associated: boolean, metadataVersion: MetadataVersionType) {
    let rawEvents: IMetadataEvent[] = [];
    if (metadataVersion === MetadataVersionType.V2) {
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

  private async getRawEvent(projectId: string, appId: string, name: string, metadataVersion: MetadataVersionType) {
    let event: IMetadataEvent | undefined;
    if (metadataVersion === MetadataVersionType.V2) {
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

  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId, attribute } = req.query;
      const associated = attribute && attribute === 'true';
      const metadataVersion = await getVersionType(projectId);
      if (metadataVersion === MetadataVersionType.UNSUPPORTED) {
        return res.status(400).json(new ApiFail('The current version does not support.'));
      }
      let events = await this.listRawEvents(projectId, appId, associated, metadataVersion);
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
      const metadataVersion = await getVersionType(projectId);
      if (metadataVersion === MetadataVersionType.UNSUPPORTED) {
        return res.status(400).json(new ApiFail('The current version does not support.'));
      }
      let event = await this.getRawEvent(projectId, appId, name, metadataVersion);
      if (!event) {
        return res.status(404).json(new ApiFail('Event not found'));
      }
      event = (await metadataDisplay.patch(projectId, appId, [event]) as IMetadataEvent[])[0];
      return res.json(new ApiSuccess(event));
    } catch (error) {
      next(error);
    }
  };

  public async trigger(req: any, res: any, next: any) {
    try {
      const { projectId, appIds } = req.body;
      const trigger = await clickStreamStore.isManualTrigger(projectId);
      if (trigger) {
        return res.status(429).json(new ApiFail('Do not trigger metadata scans frequently, please try again in 10 minutes.'));
      }
      const pipeline = await pipelineServ.getPipelineByProjectId(projectId);
      if (!pipeline) {
        return res.status(404).json(new ApiFail('Pipeline not found'));
      }
      const scanMetadataWorkflowArn = getStackOutputFromPipelineStatus(
        pipeline.status?.stackDetails,
        PipelineStackType.DATA_MODELING_REDSHIFT,
        OUTPUT_SCAN_METADATA_WORKFLOW_ARN_SUFFIX,
      );
      if (!scanMetadataWorkflowArn) {
        return res.status(400).json(new ApiFail('Scan metadata workflow not found'));
      }
      await startExecution(
        pipeline.region,
        `manual-trigger-${new Date().getTime()}`,
        scanMetadataWorkflowArn,
        JSON.stringify({
          scanStartDate: getLocalDateISOString(new Date(), -7),
          scanEndDate: getLocalDateISOString(new Date()),
          appIdList: appIds,
        }),
      );
      await clickStreamStore.saveManualTrigger(projectId);
      return res.json(new ApiSuccess(null, 'Trigger success'));
    } catch (error) {
      next(error);
    }
  };
}

interface IPathNodes {
  pageTitles: IMetadataAttributeValue[];
  pageUrls: IMetadataAttributeValue[];
  screenNames: IMetadataAttributeValue[];
  screenIds: IMetadataAttributeValue[];
}

export class MetadataEventParameterServ {
  private async listRawParameters(projectId: string, appId: string, metadataVersion: MetadataVersionType) {
    let rawEventParameters: IMetadataEventParameter[] = [];
    if (metadataVersion === MetadataVersionType.V2) {
      rawEventParameters = await metadataStore.listEventParametersV2(projectId, appId);
    } else {
      const results = await metadataStore.listEventParameters(projectId, appId);
      rawEventParameters = groupByParameterByName(results);
    }
    return rawEventParameters;
  }

  private async getRawEventParameter(projectId: string, appId: string,
    name: string, category: ConditionCategory, type: MetadataValueType, metadataVersion: MetadataVersionType) {
    let parameter: IMetadataEventParameter | undefined;
    if (metadataVersion === MetadataVersionType.V2) {
      parameter = await metadataStore.getEventParameterV2(projectId, appId, name, category, type);
    } else {
      parameter = await metadataStore.getEventParameter(projectId, appId, name, category, type);
    }
    return parameter;
  }

  private filterPathNodes(parameters: IMetadataEventParameter[]) {
    const pathNodes: IPathNodes = {
      pageTitles: [],
      pageUrls: [],
      screenNames: [],
      screenIds: [],
    };
    const pageTitles =
      parameters.find((p: IMetadataEventParameter) => p.name === '_page_title') as IMetadataEventParameter;
    const pageUrls =
      parameters.find((p: IMetadataEventParameter) => p.name === '_page_url') as IMetadataEventParameter;
    const screenNames =
      parameters.find((p: IMetadataEventParameter) => p.name === '_screen_name') as IMetadataEventParameter;
    const screenIds =
      parameters.find((p: IMetadataEventParameter) => p.name === '_screen_id') as IMetadataEventParameter;
    pathNodes.pageTitles = pathNodesToAttribute(pageTitles?.valueEnum);
    pathNodes.pageUrls = pathNodesToAttribute(pageUrls?.valueEnum);
    pathNodes.screenNames = pathNodesToAttribute(screenNames?.valueEnum);
    pathNodes.screenIds = pathNodesToAttribute(screenIds?.valueEnum);
    return pathNodes;
  }

  public async listPathNodes(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const metadataVersion = await getVersionType(projectId);
      if (metadataVersion === MetadataVersionType.UNSUPPORTED) {
        return res.status(400).json(new ApiFail('The current version does not support.'));
      }
      const rawParameters = await this.listRawParameters(projectId, appId, metadataVersion);
      const results = this.filterPathNodes(rawParameters);
      return res.json(new ApiSuccess(results));
    } catch (error) {
      next(error);
    }
  };

  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const metadataVersion = await getVersionType(projectId);
      if (metadataVersion === MetadataVersionType.UNSUPPORTED) {
        return res.status(400).json(new ApiFail('The current version does not support.'));
      }
      const parameters = await this.listRawParameters(projectId, appId, metadataVersion);
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
      const metadataVersion = await getVersionType(projectId);
      if (metadataVersion === MetadataVersionType.UNSUPPORTED) {
        return res.status(400).json(new ApiFail('The current version does not support.'));
      }
      let parameter = await this.getRawEventParameter(projectId, appId, name, category, type, metadataVersion);
      if (!parameter) {
        return res.status(404).json(new ApiFail('Event attribute not found'));
      }
      parameter = (await metadataDisplay.patch(projectId, appId, [parameter]) as IMetadataEventParameter[])[0];
      return res.json(new ApiSuccess(parameter));
    } catch (error) {
      next(error);
    }
  };

  public async builtInMetadata(_req: any, res: any, next: any) {
    try {
      const results = await metadataDisplay.getBuiltList();
      return res.json(new ApiSuccess(results));
    } catch (error) {
      next(error);
    }
  }
}

export class MetadataUserAttributeServ {
  private async listRawUserAttributes(projectId: string, appId: string, metadataVersion: MetadataVersionType) {
    let rawUserAttributes: IMetadataUserAttribute[] = [];
    if (metadataVersion === MetadataVersionType.V2) {
      rawUserAttributes = await metadataStore.listUserAttributesV2(projectId, appId);
    } else {
      rawUserAttributes = await metadataStore.listUserAttributes(projectId, appId);
    }
    return rawUserAttributes;
  };

  public async list(req: any, res: any, next: any) {
    try {
      const { projectId, appId } = req.query;
      const metadataVersion = await getVersionType(projectId);
      if (metadataVersion === MetadataVersionType.UNSUPPORTED) {
        return res.status(400).json(new ApiFail('The current version does not support.'));
      }
      const attributes = await this.listRawUserAttributes(projectId, appId, metadataVersion);
      const results = await metadataDisplay.patch(projectId, appId, attributes) as IMetadataUserAttribute[];
      return res.json(new ApiSuccess({
        totalCount: attributes.length,
        items: results,
      }));
    } catch (error) {
      next(error);
    }
  };
}
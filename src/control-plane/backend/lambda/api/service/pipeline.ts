/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { v4 as uuidv4 } from 'uuid';
import { clickStreamTableName } from '../common/constants';
import { ApiFail, ApiSuccess } from '../common/request-valid';
import { StackManager } from '../common/sfn';
import { tryToJson } from '../common/utils';
import { getIngestionStackParameters, Pipeline } from '../model/pipeline';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();
const stackManager: StackManager = new StackManager();

export class PipelineServ {
  public async list(req: any, res: any, next: any) {
    try {
      const { pid, version, pageNumber, pageSize } = req.query;
      const result = await store.listPipeline(pid, version, true, pageSize, pageNumber);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async add(req: any, res: any, next: any) {
    try {
      // create stack
      let pipeline: Pipeline = req.body;
      pipeline.pipelineId = uuidv4();
      // Get TemplateURL from dictionary
      const templates = await store.getDictionary('Templates');
      if (!templates || !templates.data) {
        return res.status(404).json(new ApiFail('Add Pipeline Error, templates not found in dictionary.'));
      }
      templates.data = tryToJson(templates.data);
      if (!templates.data.ingestion) {
        return res.status(404).json(new ApiFail('Add Pipeline Error, ingestion template url not found in dictionary.'));
      }
      // Create stack
      await stackManager.execute({
        Input: {
          Action: 'Create',
          StackName: `clickstream-pipeline-${pipeline.pipelineId}`,
          TemplateURL: templates.data.ingestion,
          Parameters: getIngestionStackParameters(pipeline),
        },
        Callback: {
          TableName: clickStreamTableName ?? '',
          ProjectId: pipeline.projectId,
          Type: `PIPELINE#${pipeline.pipelineId}#latest`,
          AttributeName: 'ingestionRuntime',
        },
      });
      const id = await store.addPipeline(pipeline);
      return res.status(201).json(new ApiSuccess({ id }, 'Pipeline added.'));
    } catch (error) {
      next(error);
    }
  };

  public async details(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      const result = await store.getPipeline(pid, id);
      if (!result) {
        return res.status(404).send(new ApiFail('Pipeline not found'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  };

  public async update(req: any, res: any, next: any) {
    try {
      let pipeline: Pipeline = req.body;
      // Read current version from db
      const curPipeline = await store.getPipeline(pipeline.projectId, pipeline.pipelineId);
      if (!curPipeline) {
        return res.status(404).send(new ApiFail('Pipeline resource does not exist.'));
      }
      await store.updatePipeline(pipeline, curPipeline);
      return res.status(201).send(new ApiSuccess(null, 'Pipeline updated.'));
    } catch (error) {
      next(error);
    }
  };

  public async delete(req: any, res: any, next: any) {
    try {
      const { id } = req.params;
      const { pid } = req.query;
      await store.deletePipeline(pid, id);
      return res.status(200).send(new ApiSuccess(null, 'Pipeline deleted.'));
    } catch (error) {
      next(error);
    }
  };

}
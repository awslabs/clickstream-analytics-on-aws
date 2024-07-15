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

import { OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_KEY, OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_VALUE, SolutionInfo, SolutionVersion, isEmpty } from '@aws/clickstream-base-lib';
import { Parameter, Tag } from '@aws-sdk/client-cloudformation';
import { cloneDeep } from 'lodash';
import { FULL_SOLUTION_VERSION, LEVEL1, LEVEL2, LEVEL3, stackWorkflowS3Bucket } from '../common/constants';
import { BuiltInTagKeys, PipelineStackType } from '../common/model-ln';
import { ClickStreamBadRequestError, PipelineSinkType, WorkflowParallelBranch, WorkflowState, WorkflowStateType, WorkflowVersion } from '../common/types';
import { getAppRegistryStackTags, getStackName, getStackPrefix, getTemplateUrlFromResource, mergeIntoPipelineTags, mergeIntoStackTags } from '../common/utils';
import { CPipelineResources, IPipeline } from '../model/pipeline';
import { CAppRegistryStack, CAthenaStack, CDataModelingStack, CDataProcessingStack, CIngestionServerStack, CKafkaConnectorStack, CMetricsStack, CReportingStack, CStreamingStack, getStackParameters } from '../model/stacks';

export async function generateWorkflow(pipeline: IPipeline, resources: CPipelineResources) {
  return {
    Version: WorkflowVersion.V20220315,
    Workflow: await generateLevelWorkflow(pipeline, resources),
  };
}

async function generateLevelWorkflow(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState> {

  return {
    Type: WorkflowStateType.PARALLEL,
    End: true,
    Branches: [
      {
        StartAt: PipelineStackType.APP_REGISTRY,
        States: {
          [PipelineStackType.APP_REGISTRY]: await getAppRegistryState(pipeline, resources),
          [LEVEL1]: await getLevel1(pipeline, resources),
          [LEVEL2]: await getLevel2(pipeline, resources),
          [LEVEL3]: await getLevel3(pipeline, resources),
        },
      },
    ],
  };
}

async function getLevel1(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState> {
  const level1State: WorkflowState = {
    Type: WorkflowStateType.PARALLEL,
    Branches: [],
    Next: LEVEL2,
  };
  const metricsState = await getMetricsState(pipeline, resources);
  if (metricsState) {
    level1State.Branches?.push({
      StartAt: PipelineStackType.METRICS,
      States: {
        [PipelineStackType.METRICS]: metricsState,
      },
    });
  }
  const ingestionBranch = await getIngestionBranch(pipeline, resources);
  if (ingestionBranch) {
    level1State.Branches?.push(ingestionBranch);
  }
  const dataProcessingState = await getDataProcessingState(pipeline, resources);
  if (dataProcessingState) {
    level1State.Branches?.push({
      StartAt: PipelineStackType.DATA_PROCESSING,
      States: {
        [PipelineStackType.DATA_PROCESSING]: dataProcessingState,
      },
    });
  }
  return level1State;

}

async function getLevel2(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState> {
  const level2State: WorkflowState = {
    Type: WorkflowStateType.PARALLEL,
    Branches: [],
    Next: LEVEL3,
  };

  const athenaState = await getAthenaState(pipeline, resources);
  if (athenaState) {
    level2State.Branches?.push({
      StartAt: PipelineStackType.ATHENA,
      States: {
        [PipelineStackType.ATHENA]: athenaState,
      },
    });
  }

  const dataModelingState = await getDataModelingState(pipeline, resources);
  if (dataModelingState) {
    level2State.Branches?.push({
      StartAt: PipelineStackType.DATA_MODELING_REDSHIFT,
      States: {
        [PipelineStackType.DATA_MODELING_REDSHIFT]: dataModelingState,
      },
    });
  }
  return level2State;

}

async function getLevel3(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState> {
  const level3State: WorkflowState = {
    Type: WorkflowStateType.PARALLEL,
    Branches: [],
    End: true,
  };

  const streamingState = await getStreamingState(pipeline, resources);
  if (streamingState) {
    level3State.Branches?.push({
      StartAt: PipelineStackType.STREAMING,
      States: {
        [PipelineStackType.STREAMING]: streamingState,
      },
    });
  }

  const reportingState = await getReportingState(pipeline, resources);
  if (reportingState) {
    level3State.Branches?.push({
      StartAt: PipelineStackType.REPORTING,
      States: {
        [PipelineStackType.REPORTING]: reportingState,
      },
    });
  }
  return level3State;

}

async function getAppRegistryState(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState> {
  if (!stackWorkflowS3Bucket) {
    throw new ClickStreamBadRequestError('Stack Workflow S3Bucket can not empty.');
  }

  const appRegistryTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.APP_REGISTRY);
  if (!appRegistryTemplateURL) {
    throw new ClickStreamBadRequestError('Template: AppRegistry not found in dictionary.');
  }

  const appRegistryStack = new CAppRegistryStack(pipeline);
  const appRegistryParameters = getStackParameters(appRegistryStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const appRegistryStackName = getStackName(pipeline, PipelineStackType.APP_REGISTRY);

  const appRegistryState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: appRegistryStackName,
        TemplateURL: appRegistryTemplateURL,
        Parameters: appRegistryParameters,
        Tags: getAppRegistryStackTags(getStackTags(pipeline)),
      },
      Callback: getStateCallback(pipeline),
    },
    Next: LEVEL1,
  };

  // Add awsApplication tag to start viewing the cost, security, and operational metrics for the application
  if (pipeline.templateVersion === FULL_SOLUTION_VERSION) {
    const awsApplicationTag: Tag = {
      Key: `#.${appRegistryStackName}.${OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_KEY}`,
      Value: `#.${appRegistryStackName}.${OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_TAG_VALUE}`,
    };
    mergeIntoStackTags(getStackTags(pipeline), awsApplicationTag);
    mergeIntoPipelineTags(pipeline.tags, awsApplicationTag); // Save tag to pipeline tags for persistence
  }
  return appRegistryState;
}

async function getMetricsState(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState> {
  const metricsTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.METRICS);
  if (!metricsTemplateURL) {
    throw new ClickStreamBadRequestError('Template: metrics not found in dictionary.');
  }

  const metricsStack = new CMetricsStack(pipeline, resources);
  const metricsStackParameters = getStackParameters(metricsStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const metricsStackStackName = getStackName(pipeline, PipelineStackType.METRICS);
  const metricsState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: metricsStackStackName,
        TemplateURL: metricsTemplateURL,
        Parameters: metricsStackParameters,
        Tags: getStackTags(pipeline),
      },
      Callback: getStateCallback(pipeline),
    },
    End: true,
  };
  return metricsState;
}

async function getDataProcessingState(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState | undefined> {
  if (isEmpty(pipeline.dataProcessing)) {
    return undefined;
  }
  if (pipeline.ingestionServer.sinkType === PipelineSinkType.KAFKA && !pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
    return undefined;
  }
  const dataPipelineTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.DATA_PROCESSING);
  if (!dataPipelineTemplateURL) {
    throw new ClickStreamBadRequestError('Template: data-pipeline not found in dictionary.');
  }

  const dataProcessingStack = new CDataProcessingStack(pipeline, resources);
  const dataProcessingStackParameters = getStackParameters(
    dataProcessingStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const dataProcessingStackName = getStackName(pipeline, PipelineStackType.DATA_PROCESSING);
  const dataProcessingState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: dataProcessingStackName,
        TemplateURL: dataPipelineTemplateURL,
        Parameters: dataProcessingStackParameters,
        Tags: getStackTags(pipeline),
      },
      Callback: getStateCallback(pipeline),
    },
    End: true,
  };
  return dataProcessingState;
}

async function getIngestionBranch(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowParallelBranch | undefined> {
  if (isEmpty(pipeline.ingestionServer)) {
    return undefined;
  }
  const ingestionTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.INGESTION);
  if (!ingestionTemplateURL) {
    throw new ClickStreamBadRequestError(`Template: ${PipelineStackType.INGESTION} not found in dictionary.`);
  }
  const ingestionStack = new CIngestionServerStack(pipeline, resources);
  const ingestionStackParameters = getStackParameters(ingestionStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const ingestionStackName = getStackName(pipeline, PipelineStackType.INGESTION);
  const ingestionState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: ingestionStackName,
        TemplateURL: ingestionTemplateURL,
        Parameters: ingestionStackParameters,
        Tags: getStackTags(pipeline),
      },
      Callback: getStateCallback(pipeline),
    },
  };

  if (pipeline.ingestionServer.sinkType === PipelineSinkType.KAFKA && pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
    const kafkaConnectorTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.KAFKA_CONNECTOR);
    if (!kafkaConnectorTemplateURL) {
      throw new ClickStreamBadRequestError('Template: kafka-s3-sink not found in dictionary.');
    }
    const kafkaConnectorStack = new CKafkaConnectorStack(pipeline, resources);
    const kafkaConnectorStackParameters = getStackParameters(
      kafkaConnectorStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
    const kafkaConnectorStackName = getStackName(pipeline, PipelineStackType.KAFKA_CONNECTOR);
    const kafkaConnectorState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: pipeline.region,
          StackName: kafkaConnectorStackName,
          TemplateURL: kafkaConnectorTemplateURL,
          Parameters: kafkaConnectorStackParameters,
          Tags: getStackTags(pipeline),
        },
        Callback: getStateCallback(pipeline),
      },
      End: true,
    };
    ingestionState.Next = PipelineStackType.KAFKA_CONNECTOR;
    return {
      StartAt: PipelineStackType.INGESTION,
      States: {
        [PipelineStackType.INGESTION]: ingestionState,
        [PipelineStackType.KAFKA_CONNECTOR]: kafkaConnectorState,
      },
    };
  }
  ingestionState.End = true;
  return {
    StartAt: PipelineStackType.INGESTION,
    States: {
      [PipelineStackType.INGESTION]: ingestionState,
    },
  };
}

async function getAthenaState(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState | undefined> {
  if (!pipeline.dataModeling?.athena) {
    return undefined;
  }
  const athenaTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.ATHENA);
  if (!athenaTemplateURL) {
    throw new ClickStreamBadRequestError('Template: Athena not found in dictionary.');
  }
  const athenaStack = new CAthenaStack(pipeline);
  const athenaStackParameters = getStackParameters(athenaStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const athenaStackName = getStackName(pipeline, PipelineStackType.ATHENA);
  const athenaState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: athenaStackName,
        TemplateURL: athenaTemplateURL,
        Parameters: athenaStackParameters,
        Tags: getStackTags(pipeline),
      },
      Callback: getStateCallback(pipeline),
    },
    End: true,
  };

  return athenaState;
}

async function getDataModelingState(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState | undefined> {
  if (isEmpty(pipeline.dataModeling?.redshift)) {
    return undefined;
  }
  if (pipeline.ingestionServer.sinkType === PipelineSinkType.KAFKA && !pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
    return undefined;
  }
  const dataModelingTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.DATA_MODELING_REDSHIFT);
  if (!dataModelingTemplateURL) {
    throw new ClickStreamBadRequestError('Template: data-analytics not found in dictionary.');
  }

  const dataModelingStack = new CDataModelingStack(pipeline, resources);
  const dataModelingStackParameters = getStackParameters(
    dataModelingStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const dataModelingStackName = getStackName(pipeline, PipelineStackType.DATA_MODELING_REDSHIFT);
  const dataModelingState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: dataModelingStackName,
        TemplateURL: dataModelingTemplateURL,
        Parameters: dataModelingStackParameters,
        Tags: getStackTags(pipeline),
      },
      Callback: getStateCallback(pipeline),
    },
    End: true,
  };
  return dataModelingState;
}

export async function getReportingState(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState | undefined> {
  if (!pipeline.reporting?.quickSight?.accountName) {
    return undefined;
  }
  const reportTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.REPORTING);
  if (!reportTemplateURL) {
    throw new ClickStreamBadRequestError('Template: quicksight not found in dictionary.');
  }
  const reportStack = new CReportingStack(pipeline, resources);
  const reportStackParameters = getStackParameters(reportStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const reportStackName = getStackName(pipeline, PipelineStackType.REPORTING);
  const reportState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: reportStackName,
        TemplateURL: reportTemplateURL,
        Parameters: reportStackParameters,
        Tags: getStackTags(pipeline),
      },
      Callback: getStateCallback(pipeline),
    },
    End: true,
  };

  return reportState;
}

export async function getStreamingState(pipeline: IPipeline, resources: CPipelineResources): Promise<WorkflowState | undefined> {
  if (!pipeline.streaming?.appIdStreamList) {
    return undefined;
  }
  const streamingTemplateURL = await getTemplateUrlFromResource(pipeline, resources, PipelineStackType.STREAMING);
  if (!streamingTemplateURL) {
    throw new ClickStreamBadRequestError('Template: streaming not found in dictionary.');
  }
  const streamingStack = new CStreamingStack(pipeline, resources);
  const streamingStackParameters = getStackParameters(streamingStack, SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION));
  const streamingStackName = getStackName(pipeline, PipelineStackType.STREAMING);
  const streamingState: WorkflowState = {
    Type: WorkflowStateType.STACK,
    Data: {
      Input: {
        Action: 'Create',
        Region: pipeline.region,
        StackName: streamingStackName,
        TemplateURL: streamingTemplateURL,
        Parameters: streamingStackParameters,
        Tags: getStackTags(pipeline),
      },
      Callback: getStateCallback(pipeline),
    },
    End: true,
  };

  return streamingState;
}

export function getStateCallback(pipeline: IPipeline, prefix?: string): { BucketName: string; BucketPrefix: string } {
  if (!stackWorkflowS3Bucket) {
    throw new ClickStreamBadRequestError('Stack Workflow S3Bucket can not empty.');
  }
  const bucketPrefix = prefix ?? `clickstream/workflow/${pipeline.executionDetail?.name ?? pipeline.status?.executionDetail?.name}`;
  return {
    BucketName: stackWorkflowS3Bucket,
    BucketPrefix: bucketPrefix,
  };
}

function getStackTags(pipeline: IPipeline) {
  // patch built-in tags
  const version = SolutionVersion.Of(pipeline.templateVersion ?? FULL_SOLUTION_VERSION);
  const builtInTagKeys = [
    BuiltInTagKeys.AWS_SOLUTION,
    BuiltInTagKeys.AWS_SOLUTION_VERSION,
    BuiltInTagKeys.CLICKSTREAM_PROJECT,
  ];
  const keys = pipeline.tags.map(tag => tag.key);
  for (let builtInTagKey of builtInTagKeys) {
    if (keys.includes(builtInTagKey)) {
      const index = keys.indexOf(builtInTagKey);
      pipeline.tags.splice(index, 1);
      keys.splice(index, 1);
    }
  }

  // Add preset tags to the beginning of the tags array
  pipeline.tags.unshift({
    key: BuiltInTagKeys.AWS_SOLUTION,
    value: SolutionInfo.SOLUTION_SHORT_NAME,
  }, {
    key: BuiltInTagKeys.AWS_SOLUTION_VERSION,
    value: version.fullVersion,
  }, {
    key: BuiltInTagKeys.CLICKSTREAM_PROJECT,
    value: pipeline.projectId,
  });

  const stackTags: Tag[] = [];
  if (pipeline.tags) {
    for (let tag of pipeline.tags) {
      stackTags.push({
        Key: tag.key,
        Value: tag.value,
      });
    }
  }
  return stackTags;
};

export async function updateReportingState(newPipeline: IPipeline, oldPipeline: IPipeline, resources: CPipelineResources, workflow: WorkflowState) {
  const newReportingEnabled = !isEmpty(newPipeline.reporting?.quickSight?.accountName);
  const oldReportingEnabled = !isEmpty(oldPipeline.reporting?.quickSight?.accountName);
  if (workflow.Branches?.length !== 1) {
    throw new Error('Workflow branches error.');
  }
  const branch = workflow.Branches[0];
  if (newReportingEnabled && !oldReportingEnabled) {
    const newReportingState = await getReportingState(newPipeline, resources);
    if (newReportingState) {
      branch.States[LEVEL3].Branches?.push({
        StartAt: PipelineStackType.REPORTING,
        States: {
          [PipelineStackType.REPORTING]: newReportingState,
        },
      });
    }
  }
}

export async function updateStreamingState(newPipeline: IPipeline, oldPipeline: IPipeline, resources: CPipelineResources, workflow: WorkflowState) {
  const newStreamingEnabled = !!newPipeline.streaming?.appIdStreamList;
  const oldStreamingEnabled = !!oldPipeline.streaming?.appIdStreamList;
  if (workflow.Branches?.length !== 1) {
    throw new Error('Workflow branches error.');
  }
  const branch = workflow.Branches[0];
  if (newStreamingEnabled && !oldStreamingEnabled) {
    const newStreamingState = await getStreamingState(newPipeline, resources);
    if (newStreamingState) {
      branch.States[LEVEL3].Branches?.push({
        StartAt: PipelineStackType.STREAMING,
        States: {
          [PipelineStackType.STREAMING]: newStreamingState,
        },
      });
    }
  }
}

export function workflowToLevel(workflow: WorkflowState): WorkflowState {
  const states = getWorkflowSates(workflow);
  const levelWorkflow: WorkflowState = {
    Type: WorkflowStateType.PARALLEL,
    End: true,
    Branches: [
      {
        StartAt: PipelineStackType.APP_REGISTRY,
        States: {
          [PipelineStackType.APP_REGISTRY]: {
            Type: WorkflowStateType.PASS,
            Data: {
              Input: {
                Action: 'Create',
                Region: '',
                StackName: '',
                TemplateURL: '',
                Parameters: [],
                Tags: [],
              },
              Callback: {
                BucketName: '',
                BucketPrefix: '',
              },
            },
          },
          [LEVEL1]: {
            Type: WorkflowStateType.PARALLEL,
            Branches: [],
            Next: LEVEL2,
          },
          [LEVEL2]: {
            Type: WorkflowStateType.PARALLEL,
            Branches: [],
            Next: LEVEL3,
          },
          [LEVEL3]: {
            Type: WorkflowStateType.PARALLEL,
            Branches: [],
            End: true,
          },
        },
      },
    ],
  };
  const serviceCatalogAppRegistry = states.find(state => state.StackType === PipelineStackType.APP_REGISTRY)?.State;
  if (serviceCatalogAppRegistry) {
    serviceCatalogAppRegistry.Next = LEVEL1;
    levelWorkflow.Branches![0].States[PipelineStackType.APP_REGISTRY] = serviceCatalogAppRegistry;
  }
  const metrics = states.find(state => state.StackType === PipelineStackType.METRICS)?.State;
  if (metrics) {
    metrics.Next = undefined;
    metrics.End = true;
    levelWorkflow.Branches![0].States[LEVEL1].Branches?.push({
      StartAt: PipelineStackType.METRICS,
      States: {
        [PipelineStackType.METRICS]: metrics as WorkflowState,
      },
    });
  }
  const ingestion = states.find(state => state.StackType === PipelineStackType.INGESTION)?.State;
  if (ingestion) {
    const kafkaConnector = states.find(state => state.StackType === PipelineStackType.KAFKA_CONNECTOR)?.State;
    if (kafkaConnector) {
      levelWorkflow.Branches![0].States[LEVEL1].Branches?.push({
        StartAt: PipelineStackType.INGESTION,
        States: {
          [PipelineStackType.INGESTION]: ingestion as WorkflowState,
          [PipelineStackType.KAFKA_CONNECTOR]: kafkaConnector as WorkflowState,
        },
      });
    } else {
      ingestion.Next = undefined;
      ingestion.End = true;
      levelWorkflow.Branches![0].States[LEVEL1].Branches?.push({
        StartAt: PipelineStackType.INGESTION,
        States: {
          [PipelineStackType.INGESTION]: ingestion as WorkflowState,
        },
      });
    }
  }
  const dataProcessing = states.find(state => state.StackType === PipelineStackType.DATA_PROCESSING)?.State;
  if (dataProcessing) {
    dataProcessing.Next = undefined;
    dataProcessing.End = true;
    levelWorkflow.Branches![0].States[LEVEL1].Branches?.push({
      StartAt: PipelineStackType.DATA_PROCESSING,
      States: {
        [PipelineStackType.DATA_PROCESSING]: dataProcessing as WorkflowState,
      },
    });
  }
  const athena = states.find(state => state.StackType === PipelineStackType.ATHENA)?.State;
  if (athena) {
    athena.Next = undefined;
    athena.End = true;
    levelWorkflow.Branches![0].States[LEVEL2].Branches?.push({
      StartAt: PipelineStackType.ATHENA,
      States: {
        [PipelineStackType.ATHENA]: athena as WorkflowState,
      },
    });
  }
  const dataModeling = states.find(state => state.StackType === PipelineStackType.DATA_MODELING_REDSHIFT)?.State;
  if (dataModeling) {
    dataModeling.Next = undefined;
    dataModeling.End = true;
    levelWorkflow.Branches![0].States[LEVEL2].Branches?.push({
      StartAt: PipelineStackType.DATA_MODELING_REDSHIFT,
      States: {
        [PipelineStackType.DATA_MODELING_REDSHIFT]: dataModeling as WorkflowState,
      },
    });
  }
  const streaming = states.find(state => state.StackType === PipelineStackType.STREAMING)?.State;
  if (streaming) {
    streaming.Next = undefined;
    streaming.End = true;
    levelWorkflow.Branches![0].States[LEVEL3].Branches?.push({
      StartAt: PipelineStackType.STREAMING,
      States: {
        [PipelineStackType.STREAMING]: streaming as WorkflowState,
      },
    });
  }
  const reporting = states.find(state => state.StackType === PipelineStackType.REPORTING)?.State;
  if (reporting) {
    reporting.Next = undefined;
    reporting.End = true;
    levelWorkflow.Branches![0].States[LEVEL3].Branches?.push({
      StartAt: PipelineStackType.REPORTING,
      States: {
        [PipelineStackType.REPORTING]: reporting as WorkflowState,
      },
    });
  }
  return levelWorkflow;
}

function getWorkflowSates(state: WorkflowState): any[] {
  let states: any[] = [];
  if (state.Type === WorkflowStateType.PARALLEL) {
    for (let branch of state.Branches as WorkflowParallelBranch[]) {
      for (let key of Object.keys(branch.States)) {
        states = states.concat(getWorkflowSates(branch.States[key]));
      }
    }
  } else if (state.Type === WorkflowStateType.STACK) {
    if (state.Data?.Input.StackName) {
      const cutPrefixName = state.Data?.Input.StackName.substring(getStackPrefix().length);
      states.push({
        StackType: cutPrefixName.split('-')[1] as PipelineStackType,
        State: state,
      });
    }
  }
  return states;
}

export function removeParameters(base: Parameter[], attach: Parameter[]) {
  const parameters = cloneDeep(base);
  const keys = parameters.map(p => p.ParameterKey);
  for (let att of attach) {
    if (keys.indexOf(att.ParameterKey) > -1) {
      const index = keys.indexOf(att.ParameterKey);
      parameters.splice(index, 1);
      keys.splice(index, 1);
    }
  }
  return parameters;
}

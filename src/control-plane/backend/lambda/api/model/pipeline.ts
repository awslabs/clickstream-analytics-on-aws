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

import { Tag } from '@aws-sdk/client-cloudformation';
import { getDiff } from 'json-difference';
import { v4 as uuidv4 } from 'uuid';
import { IDictionary } from './dictionary';
import { IPlugin } from './plugin';
import { IProject } from './project';
import {
  CAppRegistryStack,
  CAthenaStack,
  CDataModelingStack,
  CDataProcessingStack,
  CIngestionServerStack,
  CKafkaConnectorStack,
  CMetricsStack,
  CReportingStack,
  getStackParameters,
} from './stacks';
import {
  awsUrlSuffix,
  FULL_SOLUTION_VERSION,
  PIPELINE_STACKS,
  stackWorkflowS3Bucket,
} from '../common/constants';
import {
  MULTI_APP_ID_PATTERN,
  PROJECT_ID_PATTERN,
  SECRETS_MANAGER_ARN_PATTERN,
} from '../common/constants-ln';
import { BuiltInTagKeys } from '../common/model-ln';
import { SolutionInfo } from '../common/solution-info-ln';
import {
  validateIngestionServerNum,
  validatePattern,
  validatePipelineNetwork,
  validateSecretModel,
} from '../common/stack-params-valid';
import {
  ClickStreamBadRequestError,
  IngestionServerSinkBatchProps,
  IngestionServerSizeProps,
  KinesisStreamMode,
  PipelineServerProtocol,
  PipelineSinkType,
  PipelineStackType,
  PipelineStatus,
  PipelineStatusType,
  RedshiftInfo,
  StackUpdateParameter,
  WorkflowParallelBranch,
  WorkflowState,
  WorkflowStateType,
  WorkflowTemplate,
  WorkflowVersion,
} from '../common/types';
import { getStackName, isEmpty } from '../common/utils';
import { StackManager } from '../service/stack';
import { describeStack } from '../store/aws/cloudformation';
import { listMSKClusterBrokers } from '../store/aws/kafka';

import { QuickSightUserArns, registerClickstreamUser } from '../store/aws/quicksight';
import { getRedshiftInfo } from '../store/aws/redshift';
import { isBucketExist } from '../store/aws/s3';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

interface IngestionServerLoadBalancerProps {
  readonly serverEndpointPath: string;
  readonly serverCorsOrigin: string;
  readonly protocol: PipelineServerProtocol;
  readonly notificationsTopicArn?: string;
  readonly enableGlobalAccelerator: boolean;
  readonly enableApplicationLoadBalancerAccessLog: boolean;
  readonly logS3Bucket?: S3Bucket;
  readonly authenticationSecretArn?: string;
}

interface IngestionServerSinkS3Props {
  readonly sinkBucket: S3Bucket;
  readonly s3BatchMaxBytes?: number;
  readonly s3BatchTimeout?: number;
}

interface IngestionServerSinkKafkaProps {
  readonly topic: string;
  readonly brokers: string[];
  readonly securityGroupId: string;
  readonly mskCluster?: MSKClusterProps;
  readonly kafkaConnector: KafkaS3Connector;
}

interface IngestionServerSinkKinesisProps {
  readonly kinesisStreamMode: KinesisStreamMode;
  readonly kinesisShardCount?: number;
  readonly kinesisDataRetentionHours?: number;
  readonly sinkBucket: S3Bucket;
}

interface IngestionServerDomainProps {
  readonly domainName: string;
  readonly certificateArn: string;
}

interface NetworkProps {
  readonly vpcId: string;
  readonly publicSubnetIds: string[];
  privateSubnetIds: string[];
}

interface RedshiftNetworkProps {
  readonly vpcId: string;
  readonly securityGroups: string[];
  readonly subnetIds: string[];
}

interface IngestionServer {
  readonly size: IngestionServerSizeProps;
  readonly domain?: IngestionServerDomainProps;
  readonly loadBalancer: IngestionServerLoadBalancerProps;
  readonly sinkType: PipelineSinkType;
  readonly sinkBatch?: IngestionServerSinkBatchProps;
  readonly sinkS3?: IngestionServerSinkS3Props;
  readonly sinkKafka?: IngestionServerSinkKafkaProps;
  readonly sinkKinesis?: IngestionServerSinkKinesisProps;
}

export interface DataProcessing {
  readonly dataFreshnessInHour: number;
  readonly scheduleExpression: string;
  readonly sourceS3Bucket: S3Bucket;
  readonly sinkS3Bucket: S3Bucket;
  readonly pipelineBucket: S3Bucket;
  readonly outputFormat?: 'parquet' | 'json';
  readonly transformPlugin?: string;
  readonly enrichPlugin?: string[];
}

export interface KafkaS3Connector {
  readonly enable: boolean;
  readonly sinkBucket?: S3Bucket;
  readonly maxWorkerCount?: number;
  readonly minWorkerCount?: number;
  readonly workerMcuCount?: number;
  readonly pluginUrl?: string;
  readonly customConnectorConfiguration?: string;
}

export interface DataModeling {
  readonly ods?: {
    readonly bucket: S3Bucket;
    readonly fileSuffix: string;
  };
  readonly redshift?: {
    readonly dataRange: string;
    readonly newServerless?: {
      readonly baseCapacity: number;
      readonly network: RedshiftNetworkProps;
    };
    readonly existingServerless?: {
      readonly workgroupName: string;
      readonly iamRoleArn: string;
    };
    readonly provisioned?: {
      readonly clusterIdentifier: string;
      readonly dbUser: string;
    };
  };
  readonly athena: boolean;
  readonly loadWorkflow?: {
    readonly bucket?: S3Bucket;
    readonly maxFilesLimit?: number;
  };
}

export interface Reporting {
  readonly quickSight?: {
    readonly accountName: string;
    readonly namespace?: string;
    readonly vpcConnection?: string;
  };
}

export interface ITag {
  readonly key: string;
  readonly value: string;
}

interface S3Bucket {
  readonly name: string;
  readonly prefix: string;
}

interface MSKClusterProps {
  readonly name: string;
  readonly arn: string;
}

export interface IPipeline {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly projectId: string;
  readonly pipelineId: string;
  readonly region: string;
  readonly dataCollectionSDK: string;
  tags: ITag[];

  readonly network: NetworkProps;
  readonly bucket: S3Bucket;
  readonly ingestionServer: IngestionServer;
  readonly dataProcessing?: DataProcessing;
  readonly dataModeling?: DataModeling;
  readonly reporting?: Reporting;

  lastAction?: string;
  status?: PipelineStatus;
  workflow?: WorkflowTemplate;
  executionName?: string;
  executionArn?: string;
  templateVersion?: string;

  readonly version: string;
  readonly versionTag: string;
  readonly createAt: number;
  updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface CPipelineResources {
  project?: IProject;
  mskBrokers?: string[];
  appIds?: string[];
  plugins?: IPlugin[];
  redshift?: RedshiftInfo;
  solution?: IDictionary;
  templates?: IDictionary;
  quickSightSubnetIds?: string[];
  quickSightUser?: QuickSightUserArns;
}

export class CPipeline {
  private pipeline: IPipeline;
  private stackManager: StackManager;
  private resources?: CPipelineResources;
  private validateNetworkOnce: boolean;
  private stackTags?: Tag[];

  constructor(pipeline: IPipeline) {
    this.pipeline = pipeline;
    this.stackManager = new StackManager(pipeline);
    this.validateNetworkOnce = false;
  }

  public async create(): Promise<void> {
    // state machine
    this.pipeline.lastAction = 'Create';
    this.pipeline.executionName = `main-${uuidv4()}`;
    this.pipeline.workflow = await this.generateWorkflow();

    this.pipeline.templateVersion = FULL_SOLUTION_VERSION;

    this.pipeline.executionArn = await this.stackManager.execute(this.pipeline.workflow, this.pipeline.executionName);
    // bind plugin
    const pluginIds: string[] = [];
    if (this.pipeline.dataProcessing?.transformPlugin && !this.pipeline.dataProcessing?.transformPlugin?.startsWith('BUILT-IN')) {
      pluginIds.push(this.pipeline.dataProcessing?.transformPlugin);
    }
    const enrichIds = this.pipeline.dataProcessing?.enrichPlugin?.filter(e => !e.startsWith('BUILT-IN'));
    const allPluginIds = pluginIds.concat(enrichIds ?? []);
    if (!isEmpty(allPluginIds)) {
      await store.bindPlugins(allPluginIds, 1);
    }
  }

  public async update(oldPipeline: IPipeline): Promise<void> {
    if (isEmpty(oldPipeline.workflow) || isEmpty(oldPipeline.workflow?.Workflow)) {
      throw new ClickStreamBadRequestError('Pipeline Workflow can not empty.');
    }
    this.pipeline.lastAction = 'Update';
    this.pipeline.templateVersion = oldPipeline.templateVersion;
    validateIngestionServerNum(this.pipeline.ingestionServer.size);
    this.pipeline.executionName = `main-${uuidv4()}`;

    this.pipeline.status = await this.stackManager.getPipelineStatus();
    if (this.pipeline.status.status === PipelineStatusType.CREATING ||
      this.pipeline.status.status === PipelineStatusType.DELETING ||
      this.pipeline.status.status === PipelineStatusType.UPDATING) {
      throw new ClickStreamBadRequestError('Pipeline status can not allow update.');
    }
    const { editStacks, editParameters } = await this._getEditStacksAndParameters(oldPipeline);
    // update workflow
    this.stackManager.updateWorkflowParameters(editParameters);
    this.stackManager.updateWorkflowAction(editStacks);
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, this.pipeline.executionName);
    this.pipeline.tags = oldPipeline.tags;
    this.pipeline.workflow = this.stackManager.getWorkflow();

    await store.updatePipeline(this.pipeline, oldPipeline);
  }

  private async _getEditStacksAndParameters(oldPipeline: IPipeline):
  Promise<{ editStacks: string[]; editParameters: StackUpdateParameter[] }> {
    const newWorkflow = await this.generateWorkflow();
    const newStackParameters = this.stackManager.getWorkflowStackParametersMap(newWorkflow.Workflow);
    const oldStackParameters = this.stackManager.getWorkflowStackParametersMap(oldPipeline.workflow?.Workflow!);
    const diffParameters = getDiff(newStackParameters, oldStackParameters);

    // AllowedList
    const AllowedList: string[] = [
      ...CIngestionServerStack.editAllowedList(),
      ...CKafkaConnectorStack.editAllowedList(),
      ...CDataProcessingStack.editAllowedList(),
      ...CDataModelingStack.editAllowedList(),
      ...CReportingStack.editAllowedList(),
      ...CMetricsStack.editAllowedList(),
    ];
    const editKeys = diffParameters.edited.map(p => p[0]);
    const notAllowEdit: string[] = [];
    const editStacks: string[] = [];
    const editParameters: StackUpdateParameter[] = [];
    for (let key of editKeys) {
      const stackName = key.split('.')[0];
      const paramName = key.split('.')[1];
      if (stackName.startsWith(`Clickstream-${PipelineStackType.REPORTING}`) && oldPipeline.templateVersion?.startsWith('v1.0')) {
        continue; // skip reporting stack when template version is v1.0
      }
      if (!editStacks.includes(stackName)) {
        editStacks.push(stackName);
      }
      if (!AllowedList.includes(paramName)) {
        notAllowEdit.push(paramName);
      } else {
        editParameters.push({
          stackName: stackName,
          parameterKey: paramName,
          parameterValue: diffParameters.edited.find(p => p[0] === key)?.[1],
        });
      }
    }
    if (!isEmpty(notAllowEdit)) {
      throw new ClickStreamBadRequestError(`Property modification not allowed: ${notAllowEdit.join(',')}.`);
    }

    return {
      editStacks,
      editParameters,
    };
  }

  public async upgrade(oldPipeline: IPipeline): Promise<void> {
    this.pipeline.lastAction = 'Upgrade';
    validateIngestionServerNum(this.pipeline.ingestionServer.size);
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    this.pipeline.templateVersion = FULL_SOLUTION_VERSION;
    this.pipeline.workflow = await this.generateWorkflow();
    this.stackManager.setExecWorkflow(this.pipeline.workflow);
    const oldStackNames = this.stackManager.getWorkflowStacks(oldPipeline.workflow?.Workflow!);
    // update workflow
    this.stackManager.upgradeWorkflow(oldStackNames);
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipeline metadata
    await store.updatePipeline(this.pipeline, oldPipeline);
  }

  public async refreshStatus(): Promise<void> {
    this.pipeline.status = await this.stackManager.getPipelineStatus();
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  public async updateApp(appIds: string[]): Promise<void> {
    this.pipeline.lastAction = 'Update';
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    const ingestionStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.INGESTION, this.pipeline.ingestionServer.sinkType);
    const dataProcessingStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.DATA_PROCESSING, this.pipeline.ingestionServer.sinkType);
    const analyticsStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.DATA_MODELING_REDSHIFT, this.pipeline.ingestionServer.sinkType);
    const reportStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.REPORTING, this.pipeline.ingestionServer.sinkType);
    // update workflow
    this.stackManager.updateWorkflowForApp(appIds, ingestionStackName, dataProcessingStackName, analyticsStackName, reportStackName);
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipeline metadata
    this.pipeline.updateAt = Date.now();
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  public async delete(): Promise<void> {
    this.pipeline.lastAction = 'Delete';
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    // update workflow
    this.stackManager.deleteWorkflow();
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipeline metadata
    this.pipeline.updateAt = Date.now();
    await store.updatePipelineAtCurrentVersion(this.pipeline);

    // bind plugin
    const pluginIds: string[] = [];
    if (this.pipeline.dataProcessing?.transformPlugin && !this.pipeline.dataProcessing?.transformPlugin?.startsWith('BUILT-IN')) {
      pluginIds.push(this.pipeline.dataProcessing?.transformPlugin);
    }
    const enrichIds = this.pipeline.dataProcessing?.enrichPlugin?.filter(e => !e.startsWith('BUILT-IN'));
    const allPluginIds = pluginIds.concat(enrichIds ?? []);
    if (!isEmpty(allPluginIds)) {
      await store.bindPlugins(allPluginIds, -1);
    }
  }

  public async retry(): Promise<void> {
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    this.stackManager.retryWorkflow();
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipeline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  private async resourcesCheck(): Promise<void> {
    // Check project resources that in DDB
    validatePattern('ProjectId', PROJECT_ID_PATTERN, this.pipeline.projectId);

    await this._fillResources();

    await this._checkExistenceS3Bucket();

    if (!this.stackTags || this.stackTags?.length === 0) {
      this.patchBuiltInTags();
      this.stackTags = this.getStackTags();
    }

    if (!this.validateNetworkOnce) {
      this.validateNetworkOnce = true;
      await validatePipelineNetwork(this.pipeline, this.resources!);
    }

    if (this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn) {
      if (this.pipeline.ingestionServer.loadBalancer.protocol === PipelineServerProtocol.HTTP) {
        throw new ClickStreamBadRequestError(
          'Validation error: you must select protocol as HTTPS if open the authentication for ingestion server.',
        );
      }
      await validateSecretModel(this.pipeline.region, 'AuthenticationSecretArn',
        this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn, SECRETS_MANAGER_ARN_PATTERN);
    }

    if (this.pipeline.reporting) {
      const quickSightUser = await registerClickstreamUser();
      this.resources = {
        ...this.resources,
        quickSightUser: quickSightUser,
      };
    }
  }

  private async _checkExistenceS3Bucket() {
    const isExisted = await isBucketExist(this.pipeline.region, this.pipeline.bucket.name);
    if (!isExisted) {
      throw new ClickStreamBadRequestError(`Validation error: bucket ${this.pipeline.bucket.name} not found. Please check and try again.`);
    }
  }

  private async _fillResources() {
    if (!this.resources?.project) {
      this.resources = {
        ...this.resources,
        project: await this._getProject(this.pipeline),
      };
    }

    if (!this.resources.appIds) {
      this.resources = {
        ...this.resources,
        appIds: await this._getAppIds(this.pipeline),
      };
    }

    if (!this.resources.plugins) {
      this.resources = {
        ...this.resources,
        plugins: await store.listPlugin('', 'asc'),
      };
    }

    if (!this.resources.solution || !this.resources.templates) {
      this.resources = {
        ...this.resources,
        solution: await store.getDictionary('Solution'),
        templates: await store.getDictionary('Templates'),
      };
    }

    // Check AWS account resources
    if (!this.resources.mskBrokers && this.pipeline.ingestionServer.sinkKafka?.mskCluster?.arn) {
      this.resources = {
        ...this.resources,
        mskBrokers: await listMSKClusterBrokers(this.pipeline.region,
          this.pipeline.ingestionServer.sinkKafka?.mskCluster?.arn),
      };
    }

    const workgroupName = this.pipeline.dataModeling?.redshift?.existingServerless?.workgroupName;
    const clusterIdentifier = this.pipeline.dataModeling?.redshift?.provisioned?.clusterIdentifier;
    if (!this.resources.redshift && (workgroupName || clusterIdentifier)) {
      const redshift = await getRedshiftInfo(this.pipeline.region, workgroupName, clusterIdentifier);
      if (!redshift) {
        throw new ClickStreamBadRequestError('Redshift info no found. Please check and try again.');
      }
      this.resources = {
        ...this.resources,
        redshift,
      };
    }
  }

  private async _getProject(pipeline: IPipeline) {
    const project = await store.getProject(pipeline.projectId);
    if (!project) {
      throw new ClickStreamBadRequestError('Project no found. Please check and try again.');
    }
    return project;
  }

  private async _getAppIds(pipeline: IPipeline) {
    const apps = await store.listApplication(pipeline.projectId, 'asc');
    const appIds = apps.map(a => a.appId);
    if (!isEmpty(appIds)) {
      validatePattern('AppId', MULTI_APP_ID_PATTERN, appIds.join(','));
    }

    return appIds;
  }

  public async getStackTemplateNameUrlMap() {
    const stackNames = this.stackManager.getWorkflowStacks(this.pipeline.workflow?.Workflow!);
    const stackTemplateMap = new Map();
    for (let stackName of stackNames) {
      const stackType = stackName.split('-')[1] as PipelineStackType;
      let templateName: string = stackType;
      if (stackType === PipelineStackType.INGESTION) {
        templateName = `${stackType}_${this.pipeline.ingestionServer.sinkType}`;
      }
      const templateURL = await this.getTemplateUrl(templateName);
      stackTemplateMap.set(stackName, templateURL);
    }
    return stackTemplateMap;
  };

  public async getTemplateUrl(name: string) {
    if (!this.resources?.solution || !this.resources?.templates) {
      const solution = await store.getDictionary('Solution');
      const templates = await store.getDictionary('Templates');
      this.resources = {
        ...this.resources,
        solution,
        templates,
      };
    }
    if (isEmpty(this.resources?.templates?.data[name])) {
      return undefined;
    }
    const solutionName = this.resources?.solution?.data.name;
    const templateName = this.resources?.templates?.data[name] as string;
    // default/ or cn/ or 'null',''
    const prefix = isEmpty(this.resources?.solution?.data.prefix) ? '' : this.resources?.solution?.data.prefix;
    const s3Region = process.env.AWS_REGION?.startsWith('cn') ? 'cn-north-1' : 'us-east-1';
    const s3Host = `https://${this.resources?.solution?.data.dist_output_bucket}.s3.${s3Region}.${awsUrlSuffix}`;

    let version = this.resources?.solution?.data.version === 'latest' ?
      this.resources?.solution.data.target : this.resources?.solution?.data.version;
    return `${s3Host}/${solutionName}/${version}/${prefix}${templateName}`;
  };

  private patchBuiltInTags() {
    if (this.resources?.solution) {
      const builtInTagKeys = [
        BuiltInTagKeys.AWS_SOLUTION,
        BuiltInTagKeys.AWS_SOLUTION_VERSION,
        BuiltInTagKeys.CLICKSTREAM_PROJECT,
      ];
      const keys = this.pipeline.tags.map(tag => tag.key);
      for (let builtInTagKey of builtInTagKeys) {
        if (keys.includes(builtInTagKey)) {
          const index = keys.indexOf(builtInTagKey);
          this.pipeline.tags.splice(index, 1);
          keys.splice(index, 1);
        }
      }
      this.pipeline.tags.push({
        key: BuiltInTagKeys.AWS_SOLUTION,
        value: SolutionInfo.SOLUTION_SHORT_NAME,
      });
      this.pipeline.tags.push({
        key: BuiltInTagKeys.AWS_SOLUTION_VERSION,
        value: FULL_SOLUTION_VERSION,
      });
      this.pipeline.tags.push({
        key: BuiltInTagKeys.CLICKSTREAM_PROJECT,
        value: this.pipeline.projectId,
      });
    }
  };

  private getStackTags() {
    const stackTags: Tag[] = [];
    if (this.pipeline.tags) {
      for (let tag of this.pipeline.tags) {
        stackTags.push({
          Key: tag.key,
          Value: tag.value,
        });
      }
    }
    return stackTags;
  };

  public async generateWorkflow(): Promise<WorkflowTemplate> {
    await this.resourcesCheck();

    return {
      Version: WorkflowVersion.V20220315,
      Workflow: await this.generateAppRegistryWorkflow(),
    };
  }

  private async generatePipelineStacksWorkflow(): Promise<WorkflowState> {
    const state: WorkflowState = {
      Type: WorkflowStateType.PARALLEL,
      End: true,
      Branches: [],
    };

    if (!isEmpty(this.pipeline.ingestionServer)) {
      const branch = await this.getWorkflowStack(PipelineStackType.INGESTION);
      if (branch) {
        state.Branches?.push(branch);
      }
    }

    if (!isEmpty(this.pipeline.dataProcessing)) {
      const branch = await this.getWorkflowStack(PipelineStackType.DATA_PROCESSING);
      if (branch) {
        state.Branches?.push(branch);
      }
    }

    const metricsBranch = await this.getWorkflowStack(PipelineStackType.METRICS);
    if (metricsBranch) {
      state.Branches?.push(metricsBranch);
    }

    return state;
  }

  private async generateAppRegistryWorkflow(): Promise<WorkflowState> {
    if (!stackWorkflowS3Bucket) {
      throw new ClickStreamBadRequestError('Stack Workflow S3Bucket can not empty.');
    }

    const appRegistryTemplateURL = await this.getTemplateUrl(PipelineStackType.APP_REGISTRY);
    if (!appRegistryTemplateURL) {
      throw new ClickStreamBadRequestError('Template: AppRegistry not found in dictionary.');
    }

    const appRegistryStack = new CAppRegistryStack(this.pipeline);
    const appRegistryParameters = getStackParameters(appRegistryStack);
    const appRegistryStackName = getStackName(this.pipeline.pipelineId, PipelineStackType.APP_REGISTRY, this.pipeline.ingestionServer.sinkType);
    const appRegistryState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: this.pipeline.region,
          StackName: appRegistryStackName,
          TemplateURL: appRegistryTemplateURL,
          Parameters: appRegistryParameters,
          Tags: this.stackTags,
        },
        Callback: {
          BucketName: stackWorkflowS3Bucket,
          BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
        },
      },
      Next: PIPELINE_STACKS,
    };

    return {
      Type: WorkflowStateType.PARALLEL,
      End: true,
      Branches: [
        {
          StartAt: PipelineStackType.APP_REGISTRY,
          States: {
            [PipelineStackType.APP_REGISTRY]: appRegistryState,
            [PIPELINE_STACKS]: await this.generatePipelineStacksWorkflow(),
          },
        },
      ],
    };
  }

  private async getWorkflowStack(type: PipelineStackType): Promise<WorkflowParallelBranch | undefined> {
    if (!stackWorkflowS3Bucket) {
      throw new ClickStreamBadRequestError('Stack Workflow S3Bucket can not empty.');
    }
    switch (type) {
      case PipelineStackType.INGESTION:
        return this._getIngestionWorkflow(stackWorkflowS3Bucket);
      case PipelineStackType.DATA_PROCESSING:
        if (this.pipeline.ingestionServer.sinkType === PipelineSinkType.KAFKA && !this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
          return undefined;
        }
        return this._getDataProcessingWorkflow(stackWorkflowS3Bucket);
      case PipelineStackType.METRICS:
        return this._getMetricsWorkflow(stackWorkflowS3Bucket);
      default:
        return undefined;
    }
  }

  private async _getMetricsWorkflow(bucketName: string): Promise<WorkflowParallelBranch> {
    const metricsTemplateURL = await this.getTemplateUrl(PipelineStackType.METRICS);
    if (!metricsTemplateURL) {
      throw new ClickStreamBadRequestError('Template: metrics not found in dictionary.');
    }

    const metricsStack = new CMetricsStack(this.pipeline, this.resources!);
    const metricsStackParameters = getStackParameters(metricsStack);
    const metricsStackStackName = getStackName(this.pipeline.pipelineId, PipelineStackType.METRICS, this.pipeline.ingestionServer.sinkType);
    const metricsState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: this.pipeline.region,
          StackName: metricsStackStackName,
          TemplateURL: metricsTemplateURL,
          Parameters: metricsStackParameters,
          Tags: this.stackTags,
        },
        Callback: {
          BucketName: bucketName,
          BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
        },
      },
      End: true,
    };
    return {
      StartAt: PipelineStackType.METRICS,
      States: {
        [PipelineStackType.METRICS]: metricsState,
      },
    };
  }

  private async _getDataProcessingWorkflow(bucketName: string): Promise<WorkflowParallelBranch> {
    const dataPipelineTemplateURL = await this.getTemplateUrl(PipelineStackType.DATA_PROCESSING);
    if (!dataPipelineTemplateURL) {
      throw new ClickStreamBadRequestError('Template: data-pipeline not found in dictionary.');
    }

    const dataProcessingStack = new CDataProcessingStack(this.pipeline, this.resources!);
    const dataProcessingStackParameters = getStackParameters(dataProcessingStack);
    const dataProcessingStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.DATA_PROCESSING, this.pipeline.ingestionServer.sinkType);
    const dataProcessingState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: this.pipeline.region,
          StackName: dataProcessingStackName,
          TemplateURL: dataPipelineTemplateURL,
          Parameters: dataProcessingStackParameters,
          Tags: this.stackTags,
        },
        Callback: {
          BucketName: bucketName,
          BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
        },
      },
      End: true,
    };
    const branch: WorkflowParallelBranch = {
      StartAt: PipelineStackType.DATA_PROCESSING,
      States: {
        [PipelineStackType.DATA_PROCESSING]: dataProcessingState,
      },
    };
    const athenaState = await this.getAthenaState();
    if (athenaState) {
      branch.States[PipelineStackType.ATHENA] = athenaState;
      branch.States[PipelineStackType.DATA_PROCESSING].Next = PipelineStackType.ATHENA;
      delete branch.States[PipelineStackType.DATA_PROCESSING].End;
    }
    const dataModelingState = await this.getDataModelingState();
    if (dataModelingState) {
      if (athenaState) {
        branch.States[PipelineStackType.DATA_MODELING_REDSHIFT] = dataModelingState;
        branch.States[PipelineStackType.ATHENA].Next = PipelineStackType.DATA_MODELING_REDSHIFT;
        delete branch.States[PipelineStackType.ATHENA].End;
      } else {
        branch.States[PipelineStackType.DATA_MODELING_REDSHIFT] = dataModelingState;
        branch.States[PipelineStackType.DATA_PROCESSING].Next = PipelineStackType.DATA_MODELING_REDSHIFT;
        delete branch.States[PipelineStackType.DATA_PROCESSING].End;
      }
    }
    const reportingState = await this.getReportingState();
    if (reportingState && dataModelingState) {
      branch.States[PipelineStackType.REPORTING] = reportingState;
      branch.States[PipelineStackType.DATA_MODELING_REDSHIFT].Next = PipelineStackType.REPORTING;
      delete branch.States[PipelineStackType.DATA_MODELING_REDSHIFT].End;
    }
    return branch;
  }

  private async _getIngestionWorkflow(bucketName: string): Promise<WorkflowParallelBranch> {
    const ingestionTemplateURL = await this.getTemplateUrl(`${PipelineStackType.INGESTION}_${this.pipeline.ingestionServer.sinkType}`);
    if (!ingestionTemplateURL) {
      throw new ClickStreamBadRequestError(`Template: ${PipelineStackType.INGESTION}_${this.pipeline.ingestionServer.sinkType} not found in dictionary.`);
    }
    const ingestionStack = new CIngestionServerStack(this.pipeline, this.resources!);
    const ingestionStackParameters = getStackParameters(ingestionStack);
    const ingestionStackName = getStackName(this.pipeline.pipelineId, PipelineStackType.INGESTION, this.pipeline.ingestionServer.sinkType);
    const ingestionState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: this.pipeline.region,
          StackName: ingestionStackName,
          TemplateURL: ingestionTemplateURL,
          Parameters: ingestionStackParameters,
          Tags: this.stackTags,
        },
        Callback: {
          BucketName: bucketName,
          BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
        },
      },
    };

    if (this.pipeline.ingestionServer.sinkType === PipelineSinkType.KAFKA && this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
      const kafkaConnectorTemplateURL = await this.getTemplateUrl(PipelineStackType.KAFKA_CONNECTOR);
      if (!kafkaConnectorTemplateURL) {
        throw new ClickStreamBadRequestError('Template: kafka-s3-sink not found in dictionary.');
      }
      const kafkaConnectorStack = new CKafkaConnectorStack(this.pipeline, this.resources!);
      const kafkaConnectorStackParameters = getStackParameters(kafkaConnectorStack);
      const kafkaConnectorStackName = getStackName(
        this.pipeline.pipelineId, PipelineStackType.KAFKA_CONNECTOR, this.pipeline.ingestionServer.sinkType);
      const kafkaConnectorState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            Region: this.pipeline.region,
            StackName: kafkaConnectorStackName,
            TemplateURL: kafkaConnectorTemplateURL,
            Parameters: kafkaConnectorStackParameters,
            Tags: this.stackTags,
          },
          Callback: {
            BucketName: bucketName,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
          },
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

  private async getDataModelingState(): Promise<WorkflowState | undefined> {
    if (isEmpty(this.pipeline.dataModeling?.redshift)) {
      return undefined;
    }
    if (this.pipeline.ingestionServer.sinkType === 'kafka' && !this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
      return undefined;
    }
    const dataModelingTemplateURL = await this.getTemplateUrl(PipelineStackType.DATA_MODELING_REDSHIFT);
    if (!dataModelingTemplateURL) {
      throw new ClickStreamBadRequestError('Template: data-analytics not found in dictionary.');
    }

    const dataModelingStack = new CDataModelingStack(this.pipeline, this.resources!);
    const dataModelingStackParameters = getStackParameters(dataModelingStack);
    const dataModelingStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.DATA_MODELING_REDSHIFT, this.pipeline.ingestionServer.sinkType);
    const dataModelingState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: this.pipeline.region,
          StackName: dataModelingStackName,
          TemplateURL: dataModelingTemplateURL,
          Parameters: dataModelingStackParameters,
          Tags: this.stackTags,
        },
        Callback: {
          BucketName: stackWorkflowS3Bucket ?? '',
          BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
        },
      },
      End: true,
    };
    return dataModelingState;
  }

  private async getReportingState(): Promise<WorkflowState | undefined> {
    if (isEmpty(this.pipeline.reporting)) {
      return undefined;
    }
    const reportTemplateURL = await this.getTemplateUrl(PipelineStackType.REPORTING);
    if (!reportTemplateURL) {
      throw new ClickStreamBadRequestError('Template: quicksight not found in dictionary.');
    }
    const reportStack = new CReportingStack(this.pipeline, this.resources!);
    const reportStackParameters = getStackParameters(reportStack);
    const reportStackName = getStackName(this.pipeline.pipelineId, PipelineStackType.REPORTING, this.pipeline.ingestionServer.sinkType);
    const reportState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: this.pipeline.region,
          StackName: reportStackName,
          TemplateURL: reportTemplateURL,
          Parameters: reportStackParameters,
          Tags: this.stackTags,
        },
        Callback: {
          BucketName: stackWorkflowS3Bucket ?? '',
          BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
        },
      },
      End: true,
    };

    return reportState;
  }

  private async getAthenaState(): Promise<WorkflowState | undefined> {
    if (!this.pipeline.dataModeling?.athena) {
      return undefined;
    }
    const athenaTemplateURL = await this.getTemplateUrl(PipelineStackType.ATHENA);
    if (!athenaTemplateURL) {
      throw new ClickStreamBadRequestError('Template: Athena not found in dictionary.');
    }
    const athenaStack = new CAthenaStack(this.pipeline);
    const athenaStackParameters = getStackParameters(athenaStack);
    const athenaStackName = getStackName(this.pipeline.pipelineId, PipelineStackType.ATHENA, this.pipeline.ingestionServer.sinkType);
    const athenaState: WorkflowState = {
      Type: WorkflowStateType.STACK,
      Data: {
        Input: {
          Action: 'Create',
          Region: this.pipeline.region,
          StackName: athenaStackName,
          TemplateURL: athenaTemplateURL,
          Parameters: athenaStackParameters,
          Tags: this.stackTags,
        },
        Callback: {
          BucketName: stackWorkflowS3Bucket ?? '',
          BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
        },
      },
      End: true,
    };

    return athenaState;
  }

  public async getStackOutputBySuffixes(stackType: PipelineStackType, outputKeySuffixes: string[]): Promise<Map<string, string>> {
    const res: Map<string, string> = new Map<string, string>();
    const stack = await describeStack(
      this.pipeline.region,
      getStackName(this.pipeline.pipelineId, stackType, this.pipeline.ingestionServer.sinkType),
    );
    if (!stack) {
      return res;
    }
    for (let suffix of outputKeySuffixes) {
      if (stack.Outputs) {
        for (let out of stack.Outputs) {
          if (out.OutputKey?.endsWith(suffix)) {
            res.set(suffix, out.OutputValue ?? '');
            break;
          }
        }
      }
    }
    return res;
  }

  public async getPluginsInfo() {
    if (!this.resources?.plugins) {
      const plugins = await store.listPlugin('', 'asc');
      this.resources = {
        ...this.resources,
        plugins: plugins,
      };
    }
    const transformPlugins = this.resources.plugins?.filter(plugin => plugin.id === this.pipeline.dataProcessing?.transformPlugin);
    const enrichPlugin = this.resources.plugins?.filter(plugin => this.pipeline.dataProcessing?.enrichPlugin?.includes(plugin.id));
    return {
      transformPlugin: transformPlugins?.length === 1? transformPlugins[0] : null,
      enrichPlugin,
    };
  };

  public getTemplateInfo() {
    return {
      isLatest: this.pipeline.templateVersion === FULL_SOLUTION_VERSION,
      pipelineVersion: this.pipeline.templateVersion,
      solutionVersion: FULL_SOLUTION_VERSION,
    };
  };
}
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

import { Output, Parameter, Tag } from '@aws-sdk/client-cloudformation';
import { v4 as uuidv4 } from 'uuid';
import { IDictionary } from './dictionary';
import { IPlugin } from './plugin';
import { IProject } from './project';
import { awsUrlSuffix, s3MainRegion, stackWorkflowS3Bucket } from '../common/constants';
import {
  MUTIL_APP_ID_PATTERN,
  DOMAIN_NAME_PATTERN,
  KAFKA_BROKERS_PATTERN,
  KAFKA_TOPIC_PATTERN,
  PROJECT_ID_PATTERN,
  SUBNETS_PATTERN,
  VPC_ID_PARRERN,
  POSITIVE_INTEGERS,
  QUICKSIGHT_ACCOUNT_USER_NAME_PATTERN,
  QUICKSIGHT_NAMESPACE_PATTERN,
  S3_PATH_PLUGIN_JARS_PATTERN,
  S3_PATH_PLUGIN_FILES_PATTERN,
  SECRETS_MANAGER_ARN_PATTERN,
  REDSHIFT_MODE, SUBNETS_THREE_AZ_PATTERN,
} from '../common/constants-ln';
import { BuiltInTagKeys } from '../common/model-ln';
import { validatePattern, validateSecretModel, validateSubnetCrossThreeAZ } from '../common/stack-params-valid';
import {
  ClickStreamBadRequestError,
  KinesisStreamMode,
  PipelineServerProtocol,
  PipelineSinkType, PipelineStackType,
  PipelineStatus,
  ProjectEnvironment,
  RedshiftServerlessWorkgroup,
  WorkflowParallelBranch,
  WorkflowState,
  WorkflowStateType,
  WorkflowTemplate,
  WorkflowVersion,
} from '../common/types';
import { isEmpty } from '../common/utils';
import { StackManager } from '../service/stack';
import { describeStack } from '../store/aws/cloudformation';
import { listMSKClusterBrokers } from '../store/aws/kafka';

import { getRedshiftWorkgroupAndNamespace } from '../store/aws/redshift';
import { getSecretValue } from '../store/aws/secretsmanager';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

interface IngestionServerSizeProps {
  readonly serverMin: number;
  readonly serverMax: number;
  readonly warmPoolSize: number;
  readonly scaleOnCpuUtilizationPercent?: number;
}

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
  readonly mskCluster?: mskClusterProps;
  readonly kafkaConnector: KafkaS3Connector;
}

interface IngestionServerSinkKinesisProps {
  readonly kinesisStreamMode: KinesisStreamMode;
  readonly kinesisShardCount?: number;
  readonly kinesisDataRetentionHours?: number;
  readonly kinesisBatchSize?: number;
  readonly kinesisMaxBatchingWindowSeconds?: number;
  readonly sinkBucket: S3Bucket;

}

interface IngestionServerDomainProps {
  readonly domainName: string;
  readonly certificateArn: string;
}

interface NetworkProps {
  readonly vpcId: string;
  readonly publicSubnetIds: string[];
  readonly privateSubnetIds: string[];
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
  readonly sinkS3?: IngestionServerSinkS3Props;
  readonly sinkKafka?: IngestionServerSinkKafkaProps;
  readonly sinkKinesis?: IngestionServerSinkKinesisProps;
}

export interface ETL {
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
  readonly rotateIntervalMS?: number;
  readonly flushSize?: number;
  readonly customConnectorConfiguration?: string;
}

export interface DataAnalytics {
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
  readonly loadWorkflow: {
    readonly bucket?: S3Bucket;
    readonly loadJobScheduleIntervalInMinutes: number;
    readonly maxFilesLimit?: number;
    readonly processingFilesLimit?: number;
  };
  readonly upsertUsers: {
    readonly scheduleExpression: string;
  };
}

export interface Report {
  readonly quickSight?: {
    readonly accountName: string;
    readonly user: string;
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

interface mskClusterProps {
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
  readonly tags: ITag[];

  readonly network: NetworkProps;
  readonly bucket: S3Bucket;
  readonly ingestionServer: IngestionServer;
  readonly etl?: ETL;
  readonly dataAnalytics?: DataAnalytics;
  readonly report?: Report;

  status?: PipelineStatus;
  workflow?: WorkflowTemplate;
  executionName?: string;
  executionArn?: string;

  readonly version: string;
  readonly versionTag: string;
  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface IPipelineList {
  totalCount: number | undefined;
  items: IPipeline[];
}

export class CPipeline {
  private pipeline: IPipeline;
  private stackManager: StackManager;
  private project?: IProject;
  private mskBrokers?: string[];
  private appIds?: string[];
  private plugins?: IPlugin[];
  private workgroup?: RedshiftServerlessWorkgroup;
  private solution?: IDictionary;
  private templates?: IDictionary;
  private stackTags?: Tag[];

  constructor(pipeline: IPipeline) {
    this.pipeline = pipeline;
    this.stackManager = new StackManager(pipeline);
  }

  public async create(): Promise<void> {
    // state machine
    this.pipeline.executionName = `main-${uuidv4()}`;
    this.pipeline.workflow = await this.generateWorkflow();
    this.pipeline.executionArn = await this.stackManager.execute(this.pipeline.workflow, this.pipeline.executionName);
    // bind plugin
    const pluginIds: string[] = [];
    if (this.pipeline.etl?.transformPlugin && !this.pipeline.etl?.transformPlugin?.startsWith('BUILDIN')) {
      pluginIds.push(this.pipeline.etl?.transformPlugin);
    }
    const enrichIds = this.pipeline.etl?.enrichPlugin?.filter(e => !e.startsWith('BUILDIN'));
    pluginIds.concat(enrichIds!);
    await store.bindPlugins(pluginIds, 1);
  }

  public async refreshStatus(): Promise<void> {
    this.pipeline.status = await this.stackManager.getPipelineStatus();
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  public async updateETL(appIds: string[]): Promise<void> {
    const etlStackName = this.getStackName(PipelineStackType.ETL);
    const analyticsStackName = this.getStackName(PipelineStackType.DATA_ANALYTICS);
    // update workflow
    this.stackManager.updateETLWorkflow(appIds, etlStackName, analyticsStackName);
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  public async delete(): Promise<void> {
    // update workflow
    this.stackManager.deleteWorkflow();
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);

    // bind plugin
    const pluginIds: string[] = [];
    if (this.pipeline.etl?.transformPlugin && !this.pipeline.etl?.transformPlugin?.startsWith('BUILDIN')) {
      pluginIds.push(this.pipeline.etl?.transformPlugin);
    }
    const enrichIds = this.pipeline.etl?.enrichPlugin?.filter(e => !e.startsWith('BUILDIN'));
    pluginIds.concat(enrichIds!);
    await store.bindPlugins(pluginIds, -1);
  }

  public async retry(type?: PipelineStackType): Promise<void> {
    let stackName = '';
    if (type) {
      stackName = this.getStackName(type);
    }
    // update workflow
    this.stackManager.retryWorkflow(stackName);
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  private async init(): Promise<void> {
    validatePattern('ProjectId', PROJECT_ID_PATTERN, this.pipeline.projectId);
    if (!this.project) {
      const project = await store.getProject(this.pipeline.projectId);
      if (!project) {
        throw new ClickStreamBadRequestError('Project no found. Please check and try again.');
      }
      this.project = project;
    }

    if (!this.appIds) {
      const apps = await store.listApplication('asc', this.pipeline.projectId, false, 1, 1);
      this.appIds = apps.items.map(a => a.appId);

      if (!isEmpty(this.appIds)) {
        validatePattern('AppId', MUTIL_APP_ID_PATTERN, this.appIds.join(','));
      }
    }

    if (!this.plugins) {
      const plugins = await store.listPlugin('', 'asc', false, 1, 1);
      this.plugins = plugins.items;
    }

    if (!this.mskBrokers && this.pipeline.ingestionServer.sinkKafka?.mskCluster?.arn) {
      this.mskBrokers = await listMSKClusterBrokers(this.pipeline.region, this.pipeline.ingestionServer.sinkKafka?.mskCluster?.arn);
    }

    if (!this.workgroup && this.pipeline.dataAnalytics?.redshift?.existingServerless?.workgroupName) {
      const workgroup = await getRedshiftWorkgroupAndNamespace(
        this.pipeline.region, this.pipeline.dataAnalytics?.redshift?.existingServerless?.workgroupName);
      if (!workgroup) {
        throw new ClickStreamBadRequestError('Workgroup no found. Please check and try again.');
      }
      this.workgroup = workgroup;
    }

    if (!this.solution || !this.templates) {
      this.solution = await store.getDictionary('Solution');
      this.templates = await store.getDictionary('Templates');
    }

    if (!this.stackTags || this.stackTags?.length === 0) {
      await this.setTags();
      this.stackTags = this.getStackTags();
    }
  }

  private getBucketPrefix(key: string, value: string | undefined): string {
    if (value === undefined || value === '' || value === '/') {
      const prefixs: Map<string, string> = new Map();
      prefixs.set('logs-alb', `clickstream/${this.pipeline.projectId}/logs/alb/`);
      prefixs.set('logs-kafka-connector', `clickstream/${this.pipeline.projectId}/logs/kafka-connector/`);
      prefixs.set('data-buffer', `clickstream/${this.pipeline.projectId}/data/buffer/`);
      prefixs.set('data-ods', `clickstream/${this.pipeline.projectId}/data/ods/`);
      prefixs.set('data-pipeline-temp', `clickstream/${this.pipeline.projectId}/data/pipeline-temp/`);
      prefixs.set('kafka-connector-plugin', `clickstream/${this.pipeline.projectId}/runtime/ingestion/kafka-connector/plugins/`);
      return prefixs.get(key) ?? '';
    }
    if (!value.endsWith('/')) {
      return `${value}/`;
    }
    return value;
  }

  private getStackName(key: PipelineStackType): string {
    const names: Map<string, string> = new Map();
    names.set(PipelineStackType.INGESTION, `Clickstream-${PipelineStackType.INGESTION}-${this.pipeline.ingestionServer.sinkType}-${this.pipeline.pipelineId}`);
    names.set(PipelineStackType.KAFKA_CONNECTOR, `Clickstream-${PipelineStackType.KAFKA_CONNECTOR}-${this.pipeline.pipelineId}`);
    names.set(PipelineStackType.ETL, `Clickstream-${PipelineStackType.ETL}-${this.pipeline.pipelineId}`);
    names.set(PipelineStackType.DATA_ANALYTICS, `Clickstream-${PipelineStackType.DATA_ANALYTICS}-${this.pipeline.pipelineId}`);
    return names.get(key) ?? '';
  }

  public async getTemplateUrl(name: string) {
    await this.init();
    if (this.solution && this.templates) {
      if (isEmpty(this.templates.data[name])) {
        return undefined;
      }
      const s3Host = `https://${this.solution.data.dist_output_bucket}.s3.${s3MainRegion}.${awsUrlSuffix}`;
      if (this.solution.data.version === 'latest') {
        const target = this.solution.data.target;
        const prefix = this.solution.data.prefix;
        return `${s3Host}/${this.solution.data.name}/${target}/${prefix}/${this.templates.data[name]}`;
      } else {
        const version = this.solution.data.version;
        const prefix = this.solution.data.prefix;
        return `${s3Host}/${this.solution.data.name}/${version}/${prefix}/${this.templates.data[name]}`;
      }
    }
    return undefined;
  };

  public async setTags() {
    if (this.solution) {
      const builtInTagKeys = [
        BuiltInTagKeys.AWS_SOLUTION,
        BuiltInTagKeys.AWS_SOLUTION_VERSION,
        BuiltInTagKeys.CLICKSTREAM_PROJECT,
      ];
      const keys = this.pipeline.tags.map(tag => tag.key);
      for (let i = 0; i < builtInTagKeys.length; i++) {
        if (keys.indexOf(builtInTagKeys[i]) > -1) {
          const index = keys.indexOf(builtInTagKeys[i]);
          this.pipeline.tags.splice(index, 1);
          keys.splice(index, 1);
        }
      }
      this.pipeline.tags.push({ key: BuiltInTagKeys.AWS_SOLUTION, value: 'clickstream' });
      this.pipeline.tags.push({ key: BuiltInTagKeys.AWS_SOLUTION_VERSION, value: this.solution.data.version });
      this.pipeline.tags.push({ key: BuiltInTagKeys.CLICKSTREAM_PROJECT, value: this.project?.id! });
    }
  };

  private getStackTags() {
    const stackTags: Tag[] = [];
    for (let tag of this.pipeline.tags) {
      stackTags.push({ Key: tag.key, Value: tag.value });
    }
    return stackTags;
  };

  public async generateWorkflow(): Promise<WorkflowTemplate> {
    const workflowTemplate: WorkflowTemplate = {
      Version: WorkflowVersion.V20220315,
      Workflow: {
        Type: WorkflowStateType.PARALLEL,
        End: true,
        Branches: [],
      },
    };
    if (!isEmpty(this.pipeline.ingestionServer)) {
      const branch = await this.getWorkflowStack(PipelineStackType.INGESTION);
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    if (!isEmpty(this.pipeline.etl)) {
      const branch = await this.getWorkflowStack(PipelineStackType.ETL);
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    if (!isEmpty(this.pipeline.dataAnalytics)) {
      const branch = await this.getWorkflowStack(PipelineStackType.DATA_ANALYTICS);
      if (branch) {
        workflowTemplate.Workflow.Branches?.push(branch);
      }
    }
    return workflowTemplate;
  }

  private async getWorkflowStack(type: PipelineStackType): Promise<WorkflowParallelBranch | undefined> {
    await this.init();

    if (!stackWorkflowS3Bucket) {
      throw new Error('Stack Workflow S3Bucket can not empty.');
    }
    if (type === PipelineStackType.INGESTION) {
      const ingestionTemplateURL = await this.getTemplateUrl(`ingestion_${this.pipeline.ingestionServer.sinkType}`);
      if (!ingestionTemplateURL) {
        throw Error(`Template: ingestion_${this.pipeline.ingestionServer.sinkType} not found in dictionary.`);
      }
      const ingestionStackParameters = await this.getIngestionStackParameters();
      const ingestionStackName = this.getStackName(PipelineStackType.INGESTION);
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
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${ingestionStackName}`,
          },
        },
      };

      if (this.pipeline.ingestionServer.sinkType === 'kafka' && this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        const kafkaConnectorTemplateURL = await this.getTemplateUrl('kafka-s3-sink');
        if (!kafkaConnectorTemplateURL) {
          throw Error('Template: kafka-s3-sink not found in dictionary.');
        }
        const kafkaConnectorStackParameters = await this.getKafkaConnectorStackParameters();
        const kafkaConnectorStackName = this.getStackName(PipelineStackType.KAFKA_CONNECTOR);
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
              BucketName: stackWorkflowS3Bucket,
              BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${kafkaConnectorStackName}`,
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
    if (type === PipelineStackType.ETL) {
      if (this.pipeline.ingestionServer.sinkType === 'kafka' && !this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        return undefined;
      }
      const dataPipelineTemplateURL = await this.getTemplateUrl('data-pipeline');
      if (!dataPipelineTemplateURL) {
        throw Error('Template: data-pipeline not found in dictionary.');
      }

      const pipelineStackParameters = await this.getETLPipelineStackParameters();
      const pipelineStackName = this.getStackName(PipelineStackType.ETL);
      const etlState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            Region: this.pipeline.region,
            StackName: pipelineStackName,
            TemplateURL: dataPipelineTemplateURL,
            Parameters: pipelineStackParameters,
            Tags: this.stackTags,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${pipelineStackName}`,
          },
        },
        End: true,
      };
      return {
        StartAt: PipelineStackType.ETL,
        States: {
          [PipelineStackType.ETL]: etlState,
        },
      };
    }
    if (type === PipelineStackType.DATA_ANALYTICS) {
      if (this.pipeline.ingestionServer.sinkType === 'kafka' && !this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        return undefined;
      }
      const dataAnalyticsTemplateURL = await this.getTemplateUrl('data-analytics');
      if (!dataAnalyticsTemplateURL) {
        throw Error('Template: data-analytics not found in dictionary.');
      }

      const dataAnalyticsStackParameters = await this.getDataAnalyticsStackParameters();
      const dataAnalyticsStackName = this.getStackName(PipelineStackType.DATA_ANALYTICS);
      const dataAnalyticsState: WorkflowState = {
        Type: WorkflowStateType.STACK,
        Data: {
          Input: {
            Action: 'Create',
            Region: this.pipeline.region,
            StackName: dataAnalyticsStackName,
            TemplateURL: dataAnalyticsTemplateURL,
            Parameters: dataAnalyticsStackParameters,
            Tags: this.stackTags,
          },
          Callback: {
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}/${dataAnalyticsStackName}`,
          },
        },
        End: true,
      };
      return {
        StartAt: PipelineStackType.DATA_ANALYTICS,
        States: {
          [PipelineStackType.DATA_ANALYTICS]: dataAnalyticsState,
        },
      };
    }
    return undefined;
  }

  private async getIngestionStackParameters() {
    const parameters: Parameter[] = [];

    // VPC Information
    validatePattern('VpcId', VPC_ID_PARRERN, this.pipeline.network.vpcId);
    parameters.push({
      ParameterKey: 'VpcId',
      ParameterValue: this.pipeline.network.vpcId,
    });
    validatePattern('PublicSubnetIds', SUBNETS_PATTERN, this.pipeline.network.publicSubnetIds.join(','));
    parameters.push({
      ParameterKey: 'PublicSubnetIds',
      ParameterValue: this.pipeline.network.publicSubnetIds.join(','),
    });
    validatePattern('PrivateSubnetIds', SUBNETS_PATTERN, this.pipeline.network.privateSubnetIds.join(','));
    parameters.push({
      ParameterKey: 'PrivateSubnetIds',
      ParameterValue: isEmpty(this.pipeline.network.privateSubnetIds) ?
        this.pipeline.network.publicSubnetIds.join(',') : this.pipeline.network.privateSubnetIds.join(','),
    });
    // Domain Information
    if (this.pipeline.ingestionServer.loadBalancer.protocol === 'HTTPS') {
      validatePattern('DomainName', DOMAIN_NAME_PATTERN, this.pipeline.ingestionServer.domain?.domainName);
      parameters.push({
        ParameterKey: 'DomainName',
        ParameterValue: this.pipeline.ingestionServer.domain?.domainName ?? '',
      });
      parameters.push({
        ParameterKey: 'ACMCertificateArn',
        ParameterValue: this.pipeline.ingestionServer.domain?.certificateArn ?? '',
      });
    }
    // Server
    parameters.push({
      ParameterKey: 'Protocol',
      ParameterValue: this.pipeline.ingestionServer.loadBalancer.protocol,
    });
    parameters.push({
      ParameterKey: 'ServerEndpointPath',
      ParameterValue: this.pipeline.ingestionServer.loadBalancer.serverEndpointPath,
    });
    parameters.push({
      ParameterKey: 'ServerCorsOrigin',
      ParameterValue: this.pipeline.ingestionServer.loadBalancer.serverCorsOrigin ?? '',
    });
    parameters.push({
      ParameterKey: 'ServerMax',
      ParameterValue: this.pipeline.ingestionServer.size.serverMax.toString(),
    });
    parameters.push({
      ParameterKey: 'ServerMin',
      ParameterValue: this.pipeline.ingestionServer.size.serverMin.toString(),
    });
    parameters.push({
      ParameterKey: 'ScaleOnCpuUtilizationPercent',
      ParameterValue: (this.pipeline.ingestionServer.size.scaleOnCpuUtilizationPercent ?? 50).toString(),
    });
    parameters.push({
      ParameterKey: 'WarmPoolSize',
      ParameterValue: (this.pipeline.ingestionServer.size.warmPoolSize ?? 0).toString(),
    });
    parameters.push({
      ParameterKey: 'NotificationsTopicArn',
      ParameterValue: this.pipeline.ingestionServer.loadBalancer.notificationsTopicArn ?? '',
    });
    parameters.push({
      ParameterKey: 'EnableGlobalAccelerator',
      ParameterValue: this.pipeline.ingestionServer.loadBalancer.enableGlobalAccelerator ? 'Yes' : 'No',
    });
    parameters.push({
      ParameterKey: 'DevMode',
      ParameterValue: this.project?.environment === ProjectEnvironment.DEV ? 'Yes' : 'No',
    });
    let enableAuthentication = 'No';
    if (this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn) {
      validatePattern('AuthenticationSecretArn', SECRETS_MANAGER_ARN_PATTERN,
        this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn);
      const secretContent = await getSecretValue(this.pipeline.region,
        this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn);
      validateSecretModel(secretContent);
      enableAuthentication = 'Yes';
      parameters.push({
        ParameterKey: 'AuthenticationSecretArn',
        ParameterValue: this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn,
      });
    }
    parameters.push({
      ParameterKey: 'EnableAuthentication',
      ParameterValue: enableAuthentication,
    });

    // Logs
    parameters.push({
      ParameterKey: 'EnableApplicationLoadBalancerAccessLog',
      ParameterValue: this.pipeline.ingestionServer.loadBalancer.enableApplicationLoadBalancerAccessLog ? 'Yes' : 'No',
    });
    parameters.push({
      ParameterKey: 'LogS3Bucket',
      ParameterValue: this.pipeline.ingestionServer.loadBalancer.logS3Bucket?.name ?? this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'LogS3Prefix',
      ParameterValue: this.getBucketPrefix('logs-alb', this.pipeline.ingestionServer.loadBalancer.logS3Bucket?.prefix),
    });

    // S3 sink
    if (this.pipeline.ingestionServer.sinkType === 's3') {
      parameters.push({
        ParameterKey: 'S3DataBucket',
        ParameterValue: this.pipeline.ingestionServer.sinkS3?.sinkBucket.name ?? this.pipeline.bucket.name,
      });
      parameters.push({
        ParameterKey: 'S3DataPrefix',
        ParameterValue: this.getBucketPrefix('data-buffer', this.pipeline.ingestionServer.sinkS3?.sinkBucket.prefix),
      });
      parameters.push({
        ParameterKey: 'S3BatchMaxBytes',
        ParameterValue: (this.pipeline.ingestionServer.sinkS3?.s3BatchMaxBytes ?? 30000000).toString(),
      });
      parameters.push({
        ParameterKey: 'S3BatchTimeout',
        ParameterValue: (this.pipeline.ingestionServer.sinkS3?.s3BatchTimeout ?? 300).toString(),
      });

    }

    // Kafka sink
    if (this.pipeline.ingestionServer.sinkType === 'kafka') {
      const kafkaTopic = this.getKafkaTopic();
      validatePattern('KafkaTopic', KAFKA_TOPIC_PATTERN, kafkaTopic);
      if (!isEmpty(this.pipeline.ingestionServer.sinkKafka?.mskCluster)) { //MSK
        parameters.push({
          ParameterKey: 'MskClusterName',
          ParameterValue: this.pipeline.ingestionServer.sinkKafka?.mskCluster?.name ?? '',
        });
        parameters.push({
          ParameterKey: 'MskSecurityGroupId',
          ParameterValue: this.pipeline.ingestionServer.sinkKafka?.securityGroupId,
        });
        parameters.push({
          ParameterKey: 'KafkaTopic',
          ParameterValue: kafkaTopic,
        });
        let kafkaBrokers = this.pipeline.ingestionServer.sinkKafka?.brokers;
        if (isEmpty(kafkaBrokers)) {
          kafkaBrokers = this.mskBrokers;
        }
        validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, kafkaBrokers?.join(','));
        parameters.push({
          ParameterKey: 'KafkaBrokers',
          ParameterValue: kafkaBrokers?.join(','),
        });

      } else { //self hosted kafka culster
        validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, this.pipeline.ingestionServer.sinkKafka?.brokers?.join(','));
        parameters.push({
          ParameterKey: 'KafkaBrokers',
          ParameterValue: this.pipeline.ingestionServer.sinkKafka?.brokers?.join(','),
        });
        parameters.push({
          ParameterKey: 'KafkaTopic',
          ParameterValue: kafkaTopic,
        });
        parameters.push({
          ParameterKey: 'MskSecurityGroupId',
          ParameterValue: this.pipeline.ingestionServer.sinkKafka?.securityGroupId,
        });
      }

    }
    // Kinesis sink
    if (this.pipeline.ingestionServer.sinkType === 'kinesis') {
      parameters.push({
        ParameterKey: 'KinesisDataS3Bucket',
        ParameterValue: this.pipeline.ingestionServer.sinkKinesis?.sinkBucket.name ?? this.pipeline.bucket.name,
      });
      parameters.push({
        ParameterKey: 'KinesisDataS3Prefix',
        ParameterValue: this.getBucketPrefix('data-buffer', this.pipeline.ingestionServer.sinkKinesis?.sinkBucket.prefix),
      });

      const kinesisStreamMode = this.pipeline.ingestionServer.sinkKinesis?.kinesisStreamMode ?? KinesisStreamMode.ON_DEMAND;
      parameters.push({
        ParameterKey: 'KinesisStreamMode',
        ParameterValue: kinesisStreamMode,
      });
      let kinesisShardCount = '3';
      if (kinesisStreamMode === KinesisStreamMode.PROVISIONED && this.pipeline.ingestionServer.sinkKinesis?.kinesisShardCount) {
        kinesisShardCount = this.pipeline.ingestionServer.sinkKinesis?.kinesisShardCount.toString();
      }
      validatePattern('KinesisShardCount', POSITIVE_INTEGERS, kinesisShardCount);
      parameters.push({
        ParameterKey: 'KinesisShardCount',
        ParameterValue: kinesisShardCount,
      });
      parameters.push({
        ParameterKey: 'KinesisDataRetentionHours',
        ParameterValue: (this.pipeline.ingestionServer.sinkKinesis?.kinesisDataRetentionHours ?? 24).toString(),
      });
      parameters.push({
        ParameterKey: 'KinesisBatchSize',
        ParameterValue: (this.pipeline.ingestionServer.sinkKinesis?.kinesisBatchSize ?? 10000).toString(),
      });
      parameters.push({
        ParameterKey: 'KinesisMaxBatchingWindowSeconds',
        ParameterValue: (this.pipeline.ingestionServer.sinkKinesis?.kinesisMaxBatchingWindowSeconds ?? 300).toString(),
      });
    }
    return parameters;
  }

  private async getKafkaConnectorStackParameters() {
    const parameters: Parameter[] = [];

    parameters.push({
      ParameterKey: 'DataS3Bucket',
      ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.name ?? this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'DataS3Prefix',
      ParameterValue: this.getBucketPrefix('data-buffer', this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.sinkBucket?.prefix),
    });

    parameters.push({
      ParameterKey: 'LogS3Bucket',
      ParameterValue: this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'LogS3Prefix',
      ParameterValue: this.getBucketPrefix('logs-kafka-connector', ''),
    });

    parameters.push({
      ParameterKey: 'PluginS3Bucket',
      ParameterValue: this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'PluginS3Prefix',
      ParameterValue: this.getBucketPrefix('kafka-connector-plugin', ''),
    });

    parameters.push({
      ParameterKey: 'SubnetIds',
      ParameterValue: this.pipeline.network.privateSubnetIds.join(','),
    });

    let kafkaBrokers = this.pipeline.ingestionServer.sinkKafka?.brokers;
    if (isEmpty(kafkaBrokers)) {
      kafkaBrokers = this.mskBrokers;
    }
    validatePattern('KafkaBrokers', KAFKA_BROKERS_PATTERN, kafkaBrokers?.join(','));
    parameters.push({
      ParameterKey: 'KafkaBrokers',
      ParameterValue: kafkaBrokers?.join(','),
    });

    const kafkaTopic = this.getKafkaTopic();
    validatePattern('KafkaTopic', KAFKA_TOPIC_PATTERN, kafkaTopic);
    parameters.push({
      ParameterKey: 'KafkaTopic',
      ParameterValue: kafkaTopic,
    });

    if (this.pipeline.ingestionServer.sinkKafka?.mskCluster?.name) {
      parameters.push({
        ParameterKey: 'MskClusterName',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.mskCluster?.name,
      });
    }
    parameters.push({
      ParameterKey: 'SecurityGroupId',
      ParameterValue: this.pipeline.ingestionServer.sinkKafka?.securityGroupId,
    });

    if (this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.maxWorkerCount !== undefined) {
      parameters.push({
        ParameterKey: 'MaxWorkerCount',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.maxWorkerCount?.toString(),
      });
    }

    if (this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.minWorkerCount !== undefined) {
      parameters.push({
        ParameterKey: 'MinWorkerCount',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.minWorkerCount?.toString(),
      });
    }

    if (this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.workerMcuCount !== undefined) {
      parameters.push({
        ParameterKey: 'WorkerMcuCount',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.workerMcuCount?.toString(),
      });
    }

    if (this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.pluginUrl !== undefined) {
      parameters.push({
        ParameterKey: 'PluginUrl',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.pluginUrl,
      });
    }

    if (this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.rotateIntervalMS !== undefined) {
      parameters.push({
        ParameterKey: 'RotateIntervalMS',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.rotateIntervalMS.toString(),
      });
    }

    if (this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.flushSize !== undefined) {
      parameters.push({
        ParameterKey: 'FlushSize',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.flushSize.toString(),
      });
    }

    if (this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.customConnectorConfiguration !== undefined) {
      parameters.push({
        ParameterKey: 'CustomConnectorConfiguration',
        ParameterValue: this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.customConnectorConfiguration,
      });
    }

    return parameters;
  }

  private async getETLPipelineStackParameters() {
    const parameters: Parameter[] = [];

    validatePattern('VpcId', VPC_ID_PARRERN, this.pipeline.network.vpcId);
    parameters.push({
      ParameterKey: 'VpcId',
      ParameterValue: this.pipeline.network.vpcId,
    });

    validatePattern('PrivateSubnetIds', SUBNETS_PATTERN, this.pipeline.network.privateSubnetIds.join(','));
    parameters.push({
      ParameterKey: 'PrivateSubnetIds',
      ParameterValue: this.pipeline.network.privateSubnetIds.join(','),
    });

    parameters.push({
      ParameterKey: 'ProjectId',
      ParameterValue: this.pipeline.projectId,
    });

    parameters.push({
      ParameterKey: 'AppIds',
      ParameterValue: this.appIds?.join(','),
    });

    parameters.push({
      ParameterKey: 'SourceS3Bucket',
      ParameterValue: this.pipeline.etl?.sourceS3Bucket.name ?? this.pipeline.bucket.name,
    });

    let sourceS3Prefix = this.getBucketPrefix('data-buffer', this.pipeline.etl?.sourceS3Bucket.prefix);
    if (this.pipeline.ingestionServer.sinkType === 'kafka') {
      sourceS3Prefix = `${sourceS3Prefix}${this.getKafkaTopic()}/`;
    }
    parameters.push({
      ParameterKey: 'SourceS3Prefix',
      ParameterValue: sourceS3Prefix,
    });

    parameters.push({
      ParameterKey: 'SinkS3Bucket',
      ParameterValue: this.pipeline.etl?.sinkS3Bucket.name ?? this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'SinkS3Prefix',
      ParameterValue: this.getBucketPrefix('data-ods', this.pipeline.etl?.sinkS3Bucket.prefix),
    });

    parameters.push({
      ParameterKey: 'PipelineS3Bucket',
      ParameterValue: this.pipeline.etl?.pipelineBucket.name ?? this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'PipelineS3Prefix',
      ParameterValue: this.getBucketPrefix('data-pipeline-temp', this.pipeline.etl?.pipelineBucket.prefix),
    });

    parameters.push({
      ParameterKey: 'DataFreshnessInHour',
      ParameterValue: (this.pipeline.etl?.dataFreshnessInHour ?? 72).toString(),
    });

    parameters.push({
      ParameterKey: 'ScheduleExpression',
      ParameterValue: this.pipeline.etl?.scheduleExpression,
    });

    const transformerAndEnrichClassNames: string[] = [];
    const s3PathPluginJars: string[] = [];
    let s3PathPluginFiles: string[] = [];
    // Transformer
    if (!isEmpty(this.pipeline.etl?.transformPlugin) && !this.pipeline.etl?.transformPlugin?.startsWith('BUILDIN')) {
      const transformer = this.plugins?.filter(p => p.id === this.pipeline.etl?.transformPlugin)[0];
      if (transformer?.mainFunction) {
        transformerAndEnrichClassNames.push(transformer?.mainFunction);
      }
      if (transformer?.jarFile) {
        s3PathPluginJars.push(transformer?.jarFile);
      }
      if (transformer?.dependencyFiles) {
        s3PathPluginFiles = s3PathPluginFiles.concat(transformer?.dependencyFiles);
      }
    } else {
      let defaultTransformer = this.plugins?.filter(p => p.id === 'BUILDIN-1')[0];
      if (defaultTransformer?.mainFunction) {
        transformerAndEnrichClassNames.push(defaultTransformer?.mainFunction);
      }
    }
    // Enrich
    if (this.pipeline.etl?.enrichPlugin) {
      for (let enrichPluginId of this.pipeline.etl?.enrichPlugin) {
        const enrich = this.plugins?.filter(p => p.id === enrichPluginId)[0];
        if (!enrich?.id.startsWith('BUILDIN')) {
          if (enrich?.jarFile) {
            s3PathPluginJars.push(enrich?.jarFile);
          }
          if (enrich?.dependencyFiles) {
            s3PathPluginFiles = s3PathPluginFiles.concat(enrich?.dependencyFiles);
          }
        }
        if (enrich?.mainFunction) {
          transformerAndEnrichClassNames.push(enrich?.mainFunction);
        }
      }
    }

    parameters.push({
      ParameterKey: 'TransformerAndEnrichClassNames',
      ParameterValue: transformerAndEnrichClassNames.join(','),
    });

    if (!isEmpty(s3PathPluginJars)) {
      validatePattern('PluginJars', S3_PATH_PLUGIN_JARS_PATTERN, s3PathPluginJars.join(','));
    }
    parameters.push({
      ParameterKey: 'S3PathPluginJars',
      ParameterValue: s3PathPluginJars.join(','),
    });

    if (!isEmpty(s3PathPluginFiles)) {
      validatePattern('PluginFiles', S3_PATH_PLUGIN_FILES_PATTERN, s3PathPluginFiles.join(','));
    }
    parameters.push({
      ParameterKey: 'S3PathPluginFiles',
      ParameterValue: s3PathPluginFiles.join(','),
    });

    parameters.push({
      ParameterKey: 'OutputFormat',
      ParameterValue: this.pipeline.etl?.outputFormat ?? 'parquet',
    });

    return parameters;
  }

  private async getDataAnalyticsStackParameters() {
    const parameters: Parameter[] = [];

    validatePattern('VpcId', VPC_ID_PARRERN, this.pipeline.network.vpcId);
    parameters.push({
      ParameterKey: 'VpcId',
      ParameterValue: this.pipeline.network.vpcId,
    });

    validatePattern('PrivateSubnetIds', SUBNETS_PATTERN, this.pipeline.network.privateSubnetIds.join(','));
    parameters.push({
      ParameterKey: 'PrivateSubnetIds',
      ParameterValue: this.pipeline.network.privateSubnetIds.join(','),
    });

    parameters.push({
      ParameterKey: 'ProjectId',
      ParameterValue: this.pipeline.projectId,
    });

    parameters.push({
      ParameterKey: 'AppIds',
      ParameterValue: this.appIds?.join(','),
    });

    parameters.push({
      ParameterKey: 'ODSEventBucket',
      ParameterValue: this.pipeline.dataAnalytics?.ods?.bucket.name ?? this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'ODSEventPrefix',
      ParameterValue: this.getBucketPrefix('data-ods', this.pipeline.dataAnalytics?.ods?.bucket.prefix),
    });
    parameters.push({
      ParameterKey: 'ODSEventFileSuffix',
      ParameterValue: this.pipeline.dataAnalytics?.ods?.fileSuffix ?? '.snappy.parquet',
    });

    parameters.push({
      ParameterKey: 'LoadWorkflowBucket',
      ParameterValue: this.pipeline.dataAnalytics?.loadWorkflow?.bucket?.name ?? this.pipeline.bucket.name,
    });
    parameters.push({
      ParameterKey: 'LoadWorkflowBucketPrefix',
      ParameterValue: this.getBucketPrefix('data-ods', this.pipeline.dataAnalytics?.loadWorkflow?.bucket?.prefix),
    });
    parameters.push({
      ParameterKey: 'MaxFilesLimit',
      ParameterValue: (this.pipeline.dataAnalytics?.loadWorkflow?.maxFilesLimit ?? 50).toString(),
    });
    parameters.push({
      ParameterKey: 'ProcessingFilesLimit',
      ParameterValue: (this.pipeline.dataAnalytics?.loadWorkflow?.processingFilesLimit ?? 100).toString(),
    });
    if (this.pipeline.dataAnalytics?.loadWorkflow?.loadJobScheduleIntervalInMinutes) {
      parameters.push({
        ParameterKey: 'LoadJobScheduleInterval',
        ParameterValue: this.pipeline.dataAnalytics?.loadWorkflow?.loadJobScheduleIntervalInMinutes.toString(),
      });
    }

    if (this.pipeline.dataAnalytics?.redshift?.provisioned) {
      parameters.push({
        ParameterKey: 'RedshiftMode',
        ParameterValue: REDSHIFT_MODE.PROVISIONED,
      });
      parameters.push({
        ParameterKey: 'RedshiftClusterIdentifier',
        ParameterValue: this.pipeline.dataAnalytics?.redshift?.provisioned.clusterIdentifier,
      });
      parameters.push({
        ParameterKey: 'RedshiftDbUser',
        ParameterValue: this.pipeline.dataAnalytics?.redshift?.provisioned.dbUser,
      });
    } else if (this.pipeline.dataAnalytics?.redshift?.newServerless) {
      parameters.push({
        ParameterKey: 'RedshiftMode',
        ParameterValue: REDSHIFT_MODE.NEW_SERVERLESS,
      });
      let workgroupName = `clickstream-${this.project?.id.replace(/_/g, '-')}`;
      if (workgroupName.length > 120) {
        workgroupName = workgroupName.substring(0, 120);
      }
      parameters.push({
        ParameterKey: 'NewRedshiftServerlessWorkgroupName',
        ParameterValue: workgroupName,
      });

      validatePattern('VpcId', VPC_ID_PARRERN, this.pipeline.dataAnalytics?.redshift?.newServerless.network.vpcId);
      parameters.push({
        ParameterKey: 'RedshiftServerlessVPCId',
        ParameterValue: this.pipeline.dataAnalytics?.redshift?.newServerless.network.vpcId,
      });

      validatePattern('RedshiftServerlessSubnets', SUBNETS_THREE_AZ_PATTERN,
        this.pipeline.dataAnalytics?.redshift?.newServerless.network.subnetIds.join(','));
      await validateSubnetCrossThreeAZ(this.pipeline.region, this.pipeline.dataAnalytics?.redshift?.newServerless.network.subnetIds);
      parameters.push({
        ParameterKey: 'RedshiftServerlessSubnets',
        ParameterValue: this.pipeline.dataAnalytics?.redshift?.newServerless.network.subnetIds.join(','),
      });
      parameters.push({
        ParameterKey: 'RedshiftServerlessSGs',
        ParameterValue: this.pipeline.dataAnalytics?.redshift?.newServerless.network.securityGroups.join(','),
      });
      parameters.push({
        ParameterKey: 'RedshiftServerlessRPU',
        ParameterValue: this.pipeline.dataAnalytics?.redshift?.newServerless.baseCapacity.toString(),
      });
    } else if (this.pipeline.dataAnalytics?.redshift?.existingServerless) {
      parameters.push({
        ParameterKey: 'RedshiftMode',
        ParameterValue: REDSHIFT_MODE.SERVERLESS,
      });
      parameters.push({
        ParameterKey: 'RedshiftServerlessNamespaceId',
        ParameterValue: this.workgroup?.namespaceId,
      });
      parameters.push({
        ParameterKey: 'RedshiftServerlessWorkgroupId',
        ParameterValue: this.workgroup?.workgroupId,
      });
      parameters.push({
        ParameterKey: 'RedshiftServerlessWorkgroupName',
        ParameterValue: this.workgroup?.workgroupName,
      });
      parameters.push({
        ParameterKey: 'RedshiftServerlessIAMRole',
        ParameterValue: this.pipeline.dataAnalytics?.redshift?.existingServerless?.iamRoleArn,
      });
    }

    return parameters;
  }

  public async getStackOutputBySuffix(stackType: PipelineStackType, outputKeySuffix: string): Promise<string> {
    const stack = await describeStack(this.pipeline.region, this.getStackName(stackType));
    if (stack && stack.Outputs && stack.Outputs.length > 0) {
      for (let out of stack.Outputs as Output[]) {
        if (out.OutputKey?.endsWith(outputKeySuffix)) {
          return out.OutputValue ?? '';
        }
      }
    }
    return '';
  }

  private getKafkaTopic() {
    let kafkaTopic = this.pipeline.projectId;
    if (!isEmpty(this.pipeline.ingestionServer.sinkKafka?.topic)) {
      kafkaTopic = this.pipeline.ingestionServer.sinkKafka?.topic ?? this.pipeline.projectId;
    }
    return kafkaTopic;
  }
}

export async function getReportStackParameters(pipeline: IPipeline) {
  const parameters: Parameter[] = [];

  validatePattern('QuickSightAccountName', QUICKSIGHT_ACCOUNT_USER_NAME_PATTERN, pipeline.report?.quickSight?.accountName);
  parameters.push({
    ParameterKey: 'QuickSightAccountNameParam',
    ParameterValue: pipeline.report?.quickSight?.accountName,
  });

  validatePattern('QuickSightUser', QUICKSIGHT_ACCOUNT_USER_NAME_PATTERN, pipeline.report?.quickSight?.user);
  parameters.push({
    ParameterKey: 'QuickSightUserParam',
    ParameterValue: pipeline.report?.quickSight?.user,
  });

  validatePattern('QuickSightNamespace', QUICKSIGHT_NAMESPACE_PATTERN, pipeline.report?.quickSight?.namespace?? 'default');
  parameters.push({
    ParameterKey: 'QuickSightNamespaceParam',
    ParameterValue: pipeline.report?.quickSight?.namespace?? 'default',
  });

  parameters.push({
    ParameterKey: 'QuickSightVpcConnectionParam',
    ParameterValue: pipeline.report?.quickSight?.vpcConnection,
  });

  return parameters;
}

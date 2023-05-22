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

import { Output, Tag } from '@aws-sdk/client-cloudformation';
import { v4 as uuidv4 } from 'uuid';
import { IDictionary } from './dictionary';
import { IPlugin } from './plugin';
import { IProject } from './project';
import { CDataAnalyticsStack, CETLStack, CIngestionServerStack, CKafkaConnectorStack, CMetricsStack, CReportStack } from './stacks';
import { awsUrlSuffix, s3MainRegion, stackWorkflowS3Bucket } from '../common/constants';
import {
  MUTIL_APP_ID_PATTERN,
  PROJECT_ID_PATTERN,
  SECRETS_MANAGER_ARN_PATTERN,
  OUTPUT_REPORT_DASHBOARDS_SUFFIX,
  OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME,
} from '../common/constants-ln';
import { BuiltInTagKeys } from '../common/model-ln';
import { logger } from '../common/powertools';
import { SolutionInfo } from '../common/solution-info-ln';
import { validatePattern, validateSecretModel, validatePipelineNetwork } from '../common/stack-params-valid';
import {
  ClickStreamBadRequestError,
  KinesisStreamMode,
  PipelineServerProtocol,
  PipelineSinkType, PipelineStackType,
  PipelineStatus,
  RedshiftInfo,
  WorkflowParallelBranch,
  WorkflowState,
  WorkflowStateType,
  WorkflowTemplate,
  WorkflowVersion,
  IngestionServerSinkBatchProps, ReportDashboardOutput,
} from '../common/types';
import { getStackName, isEmpty } from '../common/utils';
import { StackManager } from '../service/stack';
import { describeStack } from '../store/aws/cloudformation';
import { listMSKClusterBrokers } from '../store/aws/kafka';

import { getRedshiftInfo } from '../store/aws/redshift';
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
    readonly loadJobScheduleIntervalExpression: string;
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

export interface CPipelineResources {
  project?: IProject;
  mskBrokers?: string[];
  appIds?: string[];
  plugins?: IPlugin[];
  redshift?: RedshiftInfo;
  solution?: IDictionary;
  templates?: IDictionary;
  quickSightTemplateArn?: IDictionary;
  quickSightSubnetIds?: string[];
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
    this.pipeline.executionName = `main-${uuidv4()}`;
    this.pipeline.workflow = await this.generateWorkflow();

    this.pipeline.executionArn = await this.stackManager.execute(this.pipeline.workflow, this.pipeline.executionName);
    // bind plugin
    const pluginIds: string[] = [];
    if (this.pipeline.etl?.transformPlugin && !this.pipeline.etl?.transformPlugin?.startsWith('BUILT-IN')) {
      pluginIds.push(this.pipeline.etl?.transformPlugin);
    }
    const enrichIds = this.pipeline.etl?.enrichPlugin?.filter(e => !e.startsWith('BUILT-IN'));
    pluginIds.concat(enrichIds!);
    await store.bindPlugins(pluginIds, 1);
  }

  public async refreshStatus(): Promise<void> {
    this.pipeline.status = await this.stackManager.getPipelineStatus();
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  public async updateETL(appIds: string[]): Promise<void> {
    const etlStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.ETL, this.pipeline.ingestionServer.sinkType);
    const analyticsStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.DATA_ANALYTICS, this.pipeline.ingestionServer.sinkType);
    const reportStackName = getStackName(
      this.pipeline.pipelineId, PipelineStackType.REPORT, this.pipeline.ingestionServer.sinkType);
    // update workflow
    this.stackManager.updateETLWorkflow(appIds, etlStackName, analyticsStackName, reportStackName);
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
    if (this.pipeline.etl?.transformPlugin && !this.pipeline.etl?.transformPlugin?.startsWith('BUILT-IN')) {
      pluginIds.push(this.pipeline.etl?.transformPlugin);
    }
    const enrichIds = this.pipeline.etl?.enrichPlugin?.filter(e => !e.startsWith('BUILT-IN'));
    pluginIds.concat(enrichIds!);
    await store.bindPlugins(pluginIds, -1);
  }

  public async retry(): Promise<void> {
    // update workflow
    this.stackManager.retryWorkflow();
    // create new execution
    const execWorkflow = this.stackManager.getExecWorkflow();
    const executionName = `main-${uuidv4()}`;
    this.pipeline.executionName = executionName;
    this.pipeline.executionArn = await this.stackManager.execute(execWorkflow, executionName);
    // update pipline metadata
    await store.updatePipelineAtCurrentVersion(this.pipeline);
  }

  private async resourcesCheck(): Promise<void> {
    // Check project resources that in DDB
    validatePattern('ProjectId', PROJECT_ID_PATTERN, this.pipeline.projectId);
    if (!this.resources || !this.resources.project) {
      const project = await store.getProject(this.pipeline.projectId);
      if (!project) {
        throw new ClickStreamBadRequestError('Project no found. Please check and try again.');
      }
      this.resources = {
        ...this.resources,
        project,
      };
    }

    if (!this.resources || !this.resources.appIds) {
      const apps = await store.listApplication(this.pipeline.projectId, 'asc', false, 1, 1);
      const appIds = apps.items.map(a => a.appId);
      if (!isEmpty(appIds)) {
        validatePattern('AppId', MUTIL_APP_ID_PATTERN, appIds.join(','));
      }
      this.resources = {
        ...this.resources,
        appIds,
      };
    }

    if (!this.resources || !this.resources.plugins) {
      const plugins = await store.listPlugin('', 'asc', false, 1, 1);
      this.resources = {
        ...this.resources,
        plugins: plugins.items,
      };
    }

    if (!this.resources || !this.resources.solution || !this.resources.templates || !this.resources.quickSightTemplateArn) {
      const solution = await store.getDictionary('Solution');
      const templates = await store.getDictionary('Templates');
      const quickSightTemplateArn = await store.getDictionary('QuickSightTemplateArn');
      this.resources = {
        ...this.resources,
        solution,
        templates,
        quickSightTemplateArn,
      };
    }

    if (!this.resources || !this.stackTags || this.stackTags?.length === 0) {
      this.setTags();
      this.stackTags = this.getStackTags();
    }

    // Check AWS account resources
    if (!this.resources || (!this.resources.mskBrokers && this.pipeline.ingestionServer.sinkKafka?.mskCluster?.arn)) {
      const mskBrokers = await listMSKClusterBrokers(this.pipeline.region, this.pipeline.ingestionServer.sinkKafka?.mskCluster?.arn);
      this.resources = {
        ...this.resources,
        mskBrokers,
      };
    }

    const workgroupName = this.pipeline.dataAnalytics?.redshift?.existingServerless?.workgroupName;
    const clusterIdentifier = this.pipeline.dataAnalytics?.redshift?.provisioned?.clusterIdentifier;
    if (!this.resources || (!this.resources?.redshift && (workgroupName || clusterIdentifier))) {
      const redshift = await getRedshiftInfo(this.pipeline.region, workgroupName, clusterIdentifier);
      if (!redshift) {
        throw new ClickStreamBadRequestError('Redshift info no found. Please check and try again.');
      }
      this.resources = {
        ...this.resources,
        redshift,
      };
    }
    if (!this.validateNetworkOnce) {
      this.validateNetworkOnce = true;
      await validatePipelineNetwork(this.pipeline, this.resources);
    }

    if (this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn) {
      await validateSecretModel(this.pipeline.region, 'AuthenticationSecretArn',
        this.pipeline.ingestionServer.loadBalancer.authenticationSecretArn, SECRETS_MANAGER_ARN_PATTERN);
    }
  }

  public async getTemplateUrl(name: string) {
    if (this.resources?.solution && this.resources?.templates) {
      if (isEmpty(this.resources?.templates.data[name])) {
        return undefined;
      }
      const s3Host = `https://${this.resources?.solution.data.dist_output_bucket}.s3.${s3MainRegion}.${awsUrlSuffix}`;
      if (this.resources?.solution.data.version === 'latest') {
        const target = this.resources?.solution.data.target;
        const prefix = this.resources?.solution.data.prefix;
        return `${s3Host}/${this.resources?.solution.data.name}/${target}/${prefix}/${this.resources?.templates.data[name]}`;
      } else {
        const version = this.resources?.solution.data.version;
        const prefix = this.resources?.solution.data.prefix;
        return `${s3Host}/${this.resources?.solution.data.name}/${version}/${prefix}/${this.resources?.templates.data[name]}`;
      }
    }
    return undefined;
  };

  private setTags() {
    if (this.resources?.solution) {
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
      this.pipeline.tags.push({
        key: BuiltInTagKeys.AWS_SOLUTION,
        value: SolutionInfo.SOLUTION_SHORT_NAME,
      });
      this.pipeline.tags.push({
        key: BuiltInTagKeys.AWS_SOLUTION_VERSION,
        value: this.resources?.solution.data.version,
      });
      this.pipeline.tags.push({
        key: BuiltInTagKeys.CLICKSTREAM_PROJECT,
        value: this.pipeline.projectId,
      });
    }
  };

  private getStackTags() {
    const stackTags: Tag[] = [];
    for (let tag of this.pipeline.tags) {
      stackTags.push({
        Key: tag.key,
        Value: tag.value,
      });
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
    const metricsBranch = await this.getWorkflowStack(PipelineStackType.METRICS);
    if (metricsBranch) {
      workflowTemplate.Workflow.Branches?.push(metricsBranch);
    }
    return workflowTemplate;
  }

  private async getWorkflowStack(type: PipelineStackType): Promise<WorkflowParallelBranch | undefined> {
    await this.resourcesCheck();

    if (!stackWorkflowS3Bucket) {
      throw new ClickStreamBadRequestError('Stack Workflow S3Bucket can not empty.');
    }
    if (type === PipelineStackType.INGESTION) {
      const ingestionTemplateURL = await this.getTemplateUrl(`ingestion_${this.pipeline.ingestionServer.sinkType}`);
      if (!ingestionTemplateURL) {
        throw new ClickStreamBadRequestError(`Template: ingestion_${this.pipeline.ingestionServer.sinkType} not found in dictionary.`);
      }
      const ingestionStack = new CIngestionServerStack(this.pipeline, this.resources!);
      const ingestionStackParameters = ingestionStack.parameters();
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
            BucketName: stackWorkflowS3Bucket,
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
          },
        },
      };

      if (this.pipeline.ingestionServer.sinkType === 'kafka' && this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        const kafkaConnectorTemplateURL = await this.getTemplateUrl('kafka-s3-sink');
        if (!kafkaConnectorTemplateURL) {
          throw new ClickStreamBadRequestError('Template: kafka-s3-sink not found in dictionary.');
        }
        const kafkaConnectorStack = new CKafkaConnectorStack(this.pipeline, this.resources!);
        const kafkaConnectorStackParameters = kafkaConnectorStack.parameters();
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
              BucketName: stackWorkflowS3Bucket,
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
    if (type === PipelineStackType.ETL) {
      if (this.pipeline.ingestionServer.sinkType === 'kafka' && !this.pipeline.ingestionServer.sinkKafka?.kafkaConnector.enable) {
        return undefined;
      }
      const dataPipelineTemplateURL = await this.getTemplateUrl('data-pipeline');
      if (!dataPipelineTemplateURL) {
        throw new ClickStreamBadRequestError('Template: data-pipeline not found in dictionary.');
      }

      const pipelineStack = new CETLStack(this.pipeline, this.resources!);
      const pipelineStackParameters = pipelineStack.parameters();
      const pipelineStackName = getStackName(this.pipeline.pipelineId, PipelineStackType.ETL, this.pipeline.ingestionServer.sinkType);
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
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
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
        throw new ClickStreamBadRequestError('Template: data-analytics not found in dictionary.');
      }

      const dataAnalyticsStack = new CDataAnalyticsStack(this.pipeline, this.resources!);
      const dataAnalyticsStackParameters = dataAnalyticsStack.parameters();
      const dataAnalyticsStackName = getStackName(
        this.pipeline.pipelineId, PipelineStackType.DATA_ANALYTICS, this.pipeline.ingestionServer.sinkType);
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
            BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
          },
        },
      };

      if (this.pipeline.report) {
        const reportTemplateURL = await this.getTemplateUrl('reporting');
        if (!reportTemplateURL) {
          throw new ClickStreamBadRequestError('Template: quicksight not found in dictionary.');
        }
        const reportStack = new CReportStack(this.pipeline, this.resources!);
        const reportStackParameters = reportStack.parameters();
        const reportStackName = getStackName(this.pipeline.pipelineId, PipelineStackType.REPORT, this.pipeline.ingestionServer.sinkType);
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
              BucketName: stackWorkflowS3Bucket,
              BucketPrefix: `clickstream/workflow/${this.pipeline.executionName}`,
            },
          },
          End: true,
        };
        dataAnalyticsState.Next = PipelineStackType.REPORT;
        return {
          StartAt: PipelineStackType.DATA_ANALYTICS,
          States: {
            [PipelineStackType.DATA_ANALYTICS]: dataAnalyticsState,
            [PipelineStackType.REPORT]: reportState,
          },
        };
      }

      dataAnalyticsState.End = true;
      return {
        StartAt: PipelineStackType.DATA_ANALYTICS,
        States: {
          [PipelineStackType.DATA_ANALYTICS]: dataAnalyticsState,
        },
      };
    }
    if (type === PipelineStackType.METRICS) {
      const metricsTemplateURL = await this.getTemplateUrl('metrics');
      if (!metricsTemplateURL) {
        throw new ClickStreamBadRequestError('Template: metrics not found in dictionary.');
      }

      const metricsStack = new CMetricsStack(this.pipeline);
      const metricsStackParameters = metricsStack.parameters();
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
            BucketName: stackWorkflowS3Bucket,
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
    return undefined;
  }

  public async getStackOutputBySuffixs(stackType: PipelineStackType, outputKeySuffixs: string[]): Promise<Map<string, string>> {
    const stack = await describeStack(
      this.pipeline.region,
      getStackName(this.pipeline.pipelineId, stackType, this.pipeline.ingestionServer.sinkType),
    );
    const res: Map<string, string> = new Map<string, string>();
    if (stack) {
      for (let suffix of outputKeySuffixs) {
        let value = '';
        if (stack.Outputs) {
          for (let out of stack.Outputs as Output[]) {
            if (out.OutputKey?.endsWith(suffix)) {
              value = out.OutputValue ?? '';
              break;
            }
          }
        }
        res.set(suffix, value);
      }
    }
    return res;
  }

  public async getReportDashboardsUrl() {
    let dashboards: ReportDashboardOutput[] = [];
    const reportOutputs = await this.getStackOutputBySuffixs(
      PipelineStackType.REPORT,
      [
        OUTPUT_REPORT_DASHBOARDS_SUFFIX,
      ],
    );
    const dashboardsOutputs = reportOutputs.get(OUTPUT_REPORT_DASHBOARDS_SUFFIX);
    if (dashboardsOutputs) {
      try {
        dashboards = JSON.parse(dashboardsOutputs);
      } catch (error) {
        logger.warn('Report Outputs error.', { reportOutputs });
      }
    }
    return dashboards;
  }

  public async getMetricsDashboardName() {
    const metricsOutputs = await this.getStackOutputBySuffixs(
      PipelineStackType.METRICS,
      [
        OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME,
      ],
    );
    return metricsOutputs.get(OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME);
  }
}


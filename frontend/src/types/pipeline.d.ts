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

import { SelectProps } from '@cloudscape-design/components';

export {};
declare global {
  interface IStackStatus {
    stackName: string;
    stackType: string;
    stackStatus: string;
    stackStatusReason: string;
    url: string;
  }

  interface IDashboard {
    appId: string;
    dashboardId: string;
  }

  interface IPipeline {
    id: string;
    type: string;
    prefix: string;
    pipelineId: string;
    dns?: string;
    endpoint?: string;
    appIds: string[];
    projectId: string;
    region: string;
    dataCollectionSDK: string;
    tags: ITag[];
    network: {
      vpcId: string;
      publicSubnetIds: string[];
      privateSubnetIds: string[];
    };
    bucket: {
      name: string;
      prefix: string;
    };
    ingestionServer: {
      size: {
        serverMin: number;
        serverMax: number;
        warmPoolSize: number;
        scaleOnCpuUtilizationPercent: number;
      };
      domain: {
        domainName: string;
        certificateArn: string;
      };
      loadBalancer: {
        serverEndpointPath: string;
        serverCorsOrigin: string;
        protocol: string;
        enableGlobalAccelerator: boolean;
        enableApplicationLoadBalancerAccessLog: boolean;
        authenticationSecretArn: string;
        logS3Bucket: {
          name: string;
          prefix: string;
        };
        notificationsTopicArn: string;
      };
      sinkType: string;
      sinkBatch: {
        size: number;
        intervalSeconds: number;
      };
      sinkS3: {
        sinkBucket: {
          name: string;
          prefix: string;
        };
        s3BufferSize: number;
        s3BufferInterval: number;
      };
      sinkKafka: {
        brokers: string[];
        topic: string;
        securityGroupId: string;
        mskCluster: {
          name: string;
          arn: string;
        };
        kafkaConnector: {
          enable: boolean;
        };
      };
      sinkKinesis: {
        kinesisStreamMode: string;
        kinesisShardCount: number;
        sinkBucket: {
          name: string;
          prefix: string;
        };
      };
    };
    dataProcessing: {
      dataFreshnessInHour: number;
      scheduleExpression: string;
      sourceS3Bucket: {
        name: string;
        prefix: string;
      };
      sinkS3Bucket: {
        name: string;
        prefix: string;
      };
      pipelineBucket: {
        name: string;
        prefix: string;
      };
      transformPlugin: string;
      enrichPlugin: string[];
    };
    dataModeling: {
      athena: boolean;
      redshift: {
        dataRange: number;
        provisioned: {
          clusterIdentifier: string;
          dbUser: string;
        };
        newServerless: {
          network: {
            vpcId: sring;
            subnetIds: string[];
            securityGroups: string[];
          };
          baseCapacity: number;
        };
      };
      upsertUsers: {
        scheduleExpression: string;
      };
    };
    reporting: {
      quickSight: {
        accountName: string;
        user: string;
      };
    };
    status?: {
      status: string;
      stackDetails: IStackStatus[];
    };
    workflow?: WorkflowTemplate;
    executionName?: string;
    executionArn?: string;
    dashboards?: IDashboard[];
    metricsDashboardName?: string;
    templateInfo?: {
      isLatest: boolean;
      pipelineVersion: string;
      solutionVersion: string;
    };
    version?: string;
    versionTag?: string;
    createAt?: number;
    updateAt?: number;
    operator?: string;
    deleted?: boolean;
  }

  interface IExtPipeline extends IPipeline {
    // temporary properties
    selectedRegion: SelectProps.Option | null;
    selectedVPC: SelectProps.Option | null;
    selectedSDK: SelectProps.Option | null;
    selectedPublicSubnet: OptionDefinition[];

    selectedPrivateSubnet: OptionDefinition[];
    selectedCertificate: SelectProps.Option | null;
    selectedSecret: SelectProps.Option | null;
    mskCreateMethod: string;
    selectedMSK: SelectProps.Option | null;
    seledtedKDKProvisionType: SelectProps.Option | null;
    kafkaSelfHost: boolean;
    kafkaBrokers: string;
    selectedSelfHostedMSKSG: SelectProps.Option | null;

    enableDataProcessing: boolean;
    scheduleExpression: string;

    exeCronExp: string;
    excutionFixedValue: string;
    enableRedshift: boolean;

    eventFreshValue: string;

    redshiftExecutionValue: string;
    selectedExcutionType: SelectProps.Option | null;
    selectedExcutionUnit: SelectProps.Option | null;
    selectedEventFreshUnit: SelectProps.Option | null;
    selectedRedshiftCluster: SelectProps.Option | null;
    selectedRedshiftRole: SelectProps.Option | null;
    selectedRedshiftExecutionUnit: SelectProps.Option | null;
    selectedTransformPlugins: IPlugin[];
    selectedEnrichPlugins: IPlugin[];

    enableReporting: boolean;
    selectedQuickSightUser: SelectProps.Option | null;
    arnAccountId: string;
    enableAuthentication: boolean;

    redshiftType: string; // 'provisioned' | 'serverless';
    redshiftServerlessVPC: SelectProps.Option | null;
    redshiftBaseCapacity: SelectProps.Option | null;
    redshiftServerlessSG: OptionDefinition[];
    redshiftServerlessSubnets: OptionDefinition[];
    redshiftDataLoadValue: string;
    redshiftDataLoadUnit: SelectProps.Option | null;
    redshiftUpsertFreqValue: string;
    redshiftUpsertFreqUnit: SelectProps.Option | null;

    selectedUpsertType: SelectProps.Option | null;
    upsertCronExp: string;
    selectedDataLoadType: SelectProps.Option | null;
    dataLoadCronExp: string;

    serviceStatus: {
      AGA: boolean;
      EMR_SERVERLESS: boolean;
      REDSHIFT_SERVERLESS: boolean;
      MSK: boolean;
      QUICK_SIGHT: boolean;
    };
    showServiceStatus: boolean;
    enrichPluginChanged: boolean;
    transformPluginChanged: boolean;
  }

  interface IAlarm {
    AlarmName: string;
    AlarmArn: string;
    AlarmDescription: string;
    ActionsEnabled: boolean;
    StateValue: string;
    StateReason: string;
  }

  interface IInterval {
    value: string;
    unit: string;
  }

  interface ICronFixed {
    value: string;
    unit: string;
    type: ExecutionType;
  }
}

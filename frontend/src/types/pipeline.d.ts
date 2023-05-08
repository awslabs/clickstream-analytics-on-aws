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

  interface IPipeline {
    pipelineId?: string;
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
        serverMin: string;
        serverMax: string;
        warmPoolSize: string;
        scaleOnCpuUtilizationPercent: string;
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
      sinkS3: {
        sinkBucket: {
          name: string;
          prefix: string;
        };
        s3BufferSize: string;
        s3BufferInterval: string;
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
        kinesisShardCount: string;
        sinkBucket: {
          name: string;
          prefix: string;
        };
      };
    };
    etl: {
      dataFreshnessInHour: string;
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
    dataAnalytics: {
      athena: boolean;
      redshift: {
        dataRange: string;
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
          baseCapacity: string;
        };
      };
      loadWorkflow: {
        loadJobScheduleIntervalInMinutes: string;
      };
      upsertUsers: {
        scheduleExpression: string;
      };
    };
    report: {
      quickSight: {
        accountName: string;
        user: string;
      };
    };
    status?: {
      status: string;
      stackDetails: IStackStatus[];
    };
    createAt?: string;
    updateAt?: string;
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

    enableAthena: boolean;
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
  }
}

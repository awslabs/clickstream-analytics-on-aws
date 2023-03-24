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
  interface IPipeline {
    pipelineId?: string;
    appIds: string[];
    projectId: string;
    name: string;
    description: string;
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
        enableApplicationLoadBalancerAccessLog: boolean;
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
        mskCluster: {
          name: string;
          arn: string;
          securityGroupId: string;
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
    dataModel: any;
    status?: string;
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
    mskCreateMethod: string;
    selectedMSK: SelectProps.Option | null;
    seledtedKDKProvisionType: SelectProps.Option | null;
    kafkaSelfHost: boolean;
    kafkaBrokers: string;

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
    selectedRedshiftExecutionUnit: SelectProps.Option | null;
    selectedTransformPlugins: IPlugin[];
    selectedEnrichPlugins: IPlugin[];

    selectedQuickSightRole: SelectProps.Option | null;
    quickSightDataset: string;
  }
}

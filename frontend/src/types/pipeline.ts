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

import { IPipeline, IPlugin } from '@aws/clickstream-base-lib';
import { SelectProps } from '@cloudscape-design/components';
import { ExecutionType } from 'ts/const';

export interface IExtPipeline extends IPipeline {
  // temporary properties
  selectedRegion: SelectProps.Option | null;
  selectedVPC: SelectProps.Option | null;
  selectedSDK: SelectProps.Option | null;
  selectedS3Bucket: SelectProps.Option | null;
  selectedPublicSubnet: SelectProps.Option[];

  selectedPrivateSubnet: SelectProps.Option[];
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
  arnAccountId: string;
  enableAuthentication: boolean;

  redshiftType: string;
  redshiftServerlessVPC: SelectProps.Option | null;
  redshiftBaseCapacity: SelectProps.Option | null;
  redshiftServerlessSG: SelectProps.Option[];
  redshiftServerlessSubnets: SelectProps.Option[];
  redshiftDataLoadValue: string;
  redshiftDataLoadUnit: SelectProps.Option | null;

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

export interface IDashboard {
  appId: string;
  dashboardId: string;
}

export interface IInterval {
  value: string;
  unit: string;
}

export interface ICronFixed {
  value: string;
  unit: string;
  type: ExecutionType;
}

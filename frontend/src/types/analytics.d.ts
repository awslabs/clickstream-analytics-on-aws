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

export {};
declare global {
  interface IMetadataEvent {
    readonly id: string;
    readonly type: string;
    readonly prefix: string;

    readonly projectId: string;
    readonly appId: string;

    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly metadataSource: MetadataSource;
    readonly hasData: boolean;
    readonly platform: MetadataPlatform[];
    readonly dataVolumeLastDay: number;
    readonly associatedParameters?: IMetadataRelation[];
  }

  interface IMetadataEventParameter {
    readonly id: string;
    readonly type: string;
    readonly prefix: string;

    readonly projectId: string;
    readonly appId: string;

    readonly parameterId: string;
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly metadataSource: MetadataSource;
    readonly hasData: boolean;
    readonly platform: MetadataPlatform[];
    readonly parameterType: MetadataParameterType;
    readonly valueType: MetadataValueType;
    readonly valueEnum: IMetadataAttributeValue[];
    readonly associatedEvents?: IMetadataRelation[];
  }

  interface IMetadataUserAttribute {
    readonly id: string;
    readonly type: string;
    readonly prefix: string;

    readonly projectId: string;
    readonly appId: string;

    readonly attributeId: string;
    readonly name: string;
    readonly displayName: string;
    readonly description: string;
    readonly metadataSource: MetadataSource;
    readonly hasData: boolean;
    readonly valueType: MetadataValueType;
    readonly valueEnum: IMetadataAttributeValue[];
  }

  interface IMetadataAttributeValue {
    readonly value: string;
    readonly displayValue: string;
  }

  interface IMetadataRelation {
    readonly id: string;
    readonly type: string;
    readonly prefix: string;

    readonly projectId: string;
    readonly appId: string;

    readonly eventName: string;
    readonly eventDisplayName: string;
    readonly eventDescription: string;

    readonly parameterId: string;
    readonly parameterName: string;
    readonly parameterDisplayName: string;
    readonly parameterDescription: string;
    readonly parameterValueType: MetadataValueType;
    readonly parameterMetadataSource: MetadataSource;

    readonly createAt: number;
    readonly updateAt: number;
    readonly operator: string;
    readonly deleted: boolean;
  }

  interface IFunnelRequest {
    readonly action: 'PREVIEW' | 'PUBLISH';
    readonly projectId: string;
    readonly appId: string;
    readonly pipelineId: string;

    readonly sheetName: string;
    readonly viewName: string;

    readonly dashboardCreateParameters: IDashboardCreateParameters;

    readonly computeMethod: 'USER_CNT' | 'EVENT_CNT';
    readonly specifyJoinColumn: boolean;
    readonly joinColumn?: string;
    readonly conversionIntervalType: 'CURRENT_DAY' | 'CUSTOMIZE';
    readonly conversionIntervalInSeconds?: number;
    readonly eventAndConditions: IEventAndCondition[];
    readonly timeScopeType: 'FIXED' | 'RELATIVE';
    readonly timeStart?: string;
    readonly timeEnd?: string;
    readonly lastN?: number;
    readonly timeUnit?: 'DD' | 'WK' | 'MM' | 'Q';
    readonly groupColumn: 'week' | 'day' | 'hour';
  }
  interface ICondition {
    readonly category:
      | 'user'
      | 'event'
      | 'device'
      | 'geo'
      | 'app_info'
      | 'traffic_source'
      | 'other';
    readonly property: string;
    readonly operator: string;
    readonly value: string;
    readonly dataType: 'STRING' | 'INT' | 'DOUBLE' | 'FLOAT';
  }

  interface IEventAndCondition {
    readonly eventName: string;
    readonly conditions?: Condition[];
    readonly conditionOperator?: 'and' | 'or';
  }

  interface IDashboardCreateParameters {
    readonly region: string;
    readonly redshift: {
      readonly user: string;
      readonly dataApiRole: string;
      readonly newServerless?: {
        readonly workgroupName: string;
      };
      readonly provisioned?: {
        readonly clusterIdentifier: string;
        readonly dbUser: string;
      };
    };
    readonly quickSight: {
      readonly dataSourceArn: string;
    };
  }

  interface IAnalyticsDashboard {
    readonly id: string;
    readonly type: string;
    readonly prefix: string;

    readonly projectId: string;
    readonly appId: string;
    readonly dashboardId: string;

    readonly name: string;
    readonly description: string;
    readonly region: string;
    readonly sheets: IAnalyticsDashboardSheet[];
    readonly ownerPrincipal: string;
    readonly defaultDataSourceArn: string;

    readonly createAt: number;
    readonly updateAt: number;
    readonly operator: string;
    readonly deleted: boolean;
  }

  export interface IAnalyticsDashboardSheet {
    readonly id: string;
    readonly name: string;
  }
}

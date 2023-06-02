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

const CONSOLE_CHINA_DOMAIN = 'console.amazonaws.cn';
const CONSOLE_GLOABL_DOMAIN = 'console.aws.amazon.com';

export const buildVPCLink = (region: string, vpcId: string): string => {
  if (region.startsWith('cn')) {
    return `https://${region}.${CONSOLE_CHINA_DOMAIN}/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
  }
  return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
};

const getDirPrefixByPrefixStr = (prefix: string) => {
  if (prefix && prefix.indexOf('/') >= 0) {
    const slashPos = prefix.lastIndexOf('/');
    prefix = prefix.slice(0, slashPos + 1);
  }
  return prefix;
};

export const buildS3Link = (
  region: string,
  bucketName: string,
  prefix?: string
): string => {
  if (region.startsWith('cn')) {
    if (prefix) {
      const resPrefix = getDirPrefixByPrefixStr(prefix);
      if (resPrefix.endsWith('/')) {
        return `https://${CONSOLE_CHINA_DOMAIN}/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
      }
    }
    return `https://${CONSOLE_CHINA_DOMAIN}/s3/buckets/${bucketName}`;
  }
  if (prefix) {
    const resPrefix = getDirPrefixByPrefixStr(prefix);
    if (resPrefix.endsWith('/')) {
      return `https://s3.${CONSOLE_GLOABL_DOMAIN}/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
    }
  }
  return `https://s3.${CONSOLE_GLOABL_DOMAIN}/s3/buckets/${bucketName}`;
};

export const buildSubnetLink = (region: string, subnetId: string): string => {
  if (region.startsWith('cn')) {
    return `https://${region}.${CONSOLE_CHINA_DOMAIN}/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
  }
  return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
};

export const buildReshiftLink = (
  region: string,
  cluster: string,
  type: string
) => {
  if (region.startsWith('cn')) {
    return `https://${region}.${CONSOLE_CHINA_DOMAIN}/redshiftv2/home?region=${region}#cluster-details?cluster=${cluster}`;
  }
  if (type === 'serverless') {
    return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/redshiftv2/home?region=${region}#serverless-dashboard`;
  }
  return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/redshiftv2/home?region=${region}#cluster-details?cluster=${cluster}`;
};

export const buildQuickSightDashboardLink = (
  region: string,
  dashboardId: string
): string => {
  return `https://${region}.quicksight.aws.amazon.com/sn/dashboards/${dashboardId}`;
};

export const buildMetricsDashboardLink = (
  region: string,
  dashboardName: string
): string => {
  if (region.startsWith('cn')) {
    return `https://${region}.${CONSOLE_CHINA_DOMAIN}/cloudwatch/home?region=${region}#dashboards:name=${dashboardName}`;
  }
  return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/cloudwatch/home?region=${region}#dashboards:name=${dashboardName}`;
};

export const buildQuickSightSubscriptionLink = (): string => {
  return 'https://us-east-1.quicksight.aws.amazon.com/sn/start';
};

export const buildAlarmsLink = (region: string, projectId: string): string => {
  if (region.startsWith('cn')) {
    return `https://${region}.${CONSOLE_CHINA_DOMAIN}/cloudwatch/home?region=${region}#alarmsV2:?~(search~'Clickstream*7c${projectId})`;
  }
  return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/cloudwatch/home?region=${region}#alarmsV2:?~(search~'Clickstream*7c${projectId})`;
};

export const buildCloudFormationStackLink = (
  region: string,
  stackId: string
) => {
  if (region.startsWith('cn')) {
    return `https://${region}.${CONSOLE_CHINA_DOMAIN}/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackId}`;
  }
  return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${stackId}`;
};

export const buildMSKLink = (region: string, arn: string) => {
  if (region.startsWith('cn')) {
    return `https://${region}.${CONSOLE_CHINA_DOMAIN}/msk/home?region=${region}#/cluster/${arn}/view`;
  }
  return `https://${region}.${CONSOLE_GLOABL_DOMAIN}/msk/home?region=${region}#/cluster/${arn}/view`;
};

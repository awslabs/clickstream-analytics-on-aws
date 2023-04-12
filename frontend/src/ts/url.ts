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

export const buildVPCLink = (region: string, vpcId: string): string => {
  if (region.startsWith('cn')) {
    return `https://${region}.console.amazonaws.cn/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
  }
  return `https://${region}.console.aws.amazon.com/vpc/home?region=${region}#vpcs:VpcId=${vpcId}`;
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
        return `https://console.amazonaws.cn/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
      }
    }
    return `https://console.amazonaws.cn/s3/buckets/${bucketName}`;
  }
  if (prefix) {
    const resPrefix = getDirPrefixByPrefixStr(prefix);
    if (resPrefix.endsWith('/')) {
      return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}?region=${region}&prefix=${resPrefix}`;
    }
  }
  return `https://s3.console.aws.amazon.com/s3/buckets/${bucketName}`;
};

export const buildSubnetLink = (region: string, subnetId: string): string => {
  if (region.startsWith('cn')) {
    return `https://console.amazonaws.cn/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
  }
  return `https://console.aws.amazon.com/vpc/home?region=${region}#subnets:subnetId=${subnetId}`;
};

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

import { ClickStreamBadRequestError } from './types';
import { getSubnet } from '../store/aws/ec2';

export const validatePattern = (parameter: string, pattern: string, value: string | undefined) => {
  if (!value) {
    throw new ClickStreamBadRequestError(`Validate error, ${parameter}: undefined not match ${pattern}. Please check and try again.`);
  }
  const regexp = new RegExp(pattern);
  const match = value.match(regexp);
  if (!match || value !== match[0]) {
    throw new ClickStreamBadRequestError(`Validate error, ${parameter}: ${value} not match ${pattern}. Please check and try again.`);
  }
  return true;
};

export const validateSecretModel = (secretValue: string|undefined) => {
  try {
    if (!secretValue) {
      throw new ClickStreamBadRequestError('Validate error, AuthenticationSecret is undefined. Please check and try again.');
    }
    const secret = JSON.parse(secretValue);
    const keys = secret.issuer &&
      secret.userEndpoint &&
      secret.authorizationEndpoint &&
      secret.tokenEndpoint &&
      secret.appClientId &&
      secret.appClientSecret;
    if (!keys) {
      throw new ClickStreamBadRequestError('Validate error, AuthenticationSecret format mismatch. Please check and try again.');
    }
  } catch (err) {
    throw new ClickStreamBadRequestError('Validate error, AuthenticationSecret format mismatch. Please check and try again.');
  }
  return true;
};

export const validateSubnetCrossThreeAZ = async (region: string, subnetIds: string[]) => {
  const azSet = new Set();
  for (let subnetId of subnetIds) {
    const subnet = await getSubnet(region, subnetId);
    azSet.add(subnet.AvailabilityZone);
  }
  if (azSet.size < 3) {
    throw new ClickStreamBadRequestError(
      'Validate error, the network for deploying Redshift serverless workgroup at least three subnets that cross three AZs. ' +
      'Please check and try again.',
    );
  }
  return true;
};



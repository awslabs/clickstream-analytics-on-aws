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

import fetch from 'node-fetch';
import { ALBLogServiceAccountMapping } from '../common/constants-ln';
import { ApiFail, ApiSuccess, Policy, PolicyStatement } from '../common/types';
import { getRegionAccount } from '../common/utils';
import { ListCertificates } from '../store/aws/acm';
import { athenaPing, listWorkGroups } from '../store/aws/athena';
import { describeVpcs, listRegions, describeSubnetsWithType, describeVpcs3AZ, describeSecurityGroups } from '../store/aws/ec2';
import { listRoles } from '../store/aws/iam';
import { listMSKCluster, mskPing } from '../store/aws/kafka';
import {
  createAccountSubscription,
  deleteAccountSubscription,
  describeClickstreamAccountSubscription,
  listQuickSightUsers,
  quickSightPing,
  registerQuickSightUser,
} from '../store/aws/quicksight';
import { describeRedshiftClusters, listRedshiftServerlessWorkgroups } from '../store/aws/redshift';
import { listHostedZones } from '../store/aws/route53';
import { getS3BucketPolicy, listBuckets } from '../store/aws/s3';
import { listSecrets } from '../store/aws/secretsmanager';
import { AssumeUploadRole } from '../store/aws/sts';


export class EnvironmentServ {

  public async listRegions(_req: any, res: any, next: any) {
    try {
      const result = await listRegions();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeVpcs(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await describeVpcs(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeVpcs3AZ(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await describeVpcs3AZ(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeSubnets(req: any, res: any, next: any) {
    try {
      const { region, vpcId, subnetType } = req.query;
      const result = await describeSubnetsWithType(region, vpcId, subnetType);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeSecurityGroups(req: any, res: any, next: any) {
    try {
      const { region, vpcId } = req.query;
      const result = await describeSecurityGroups(region, vpcId);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listBuckets(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listBuckets(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async checkALBLogPolicy(req: any, res: any, next: any) {
    try {
      const { region, bucket } = req.query;
      const policyStr = await getS3BucketPolicy(bucket);
      const partition = region.startsWith('cn') ? 'aws-cn' : 'aws';
      if (policyStr) {
        const accountId = getRegionAccount(ALBLogServiceAccountMapping.mapping, region);
        if (accountId) {
          const check = this.checkPolicy(
            policyStr,
            { key: 'AWS', value: `arn:${partition}:iam::${accountId}:root` },
            `arn:${partition}:s3:::${bucket}/clickstream/*`);
          return res.json(new ApiSuccess({ check: check }));
        } else {
          const check = this.checkPolicy(
            policyStr,
            { key: 'Service', value: 'logdelivery.elasticloadbalancing.amazonaws.com' },
            `arn:${partition}:s3:::${bucket}/clickstream/*`);
          return res.json(new ApiSuccess({ check: check }));
        }
      }
      return res.json(new ApiSuccess({ check: false }));
    } catch (error) {
      next(error);
    }
  }
  public async listMSKCluster(req: any, res: any, next: any) {
    try {
      const { region, vpcId } = req.query;
      const result = await listMSKCluster(region, vpcId);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeRedshiftClusters(req: any, res: any, next: any) {
    try {
      const { region, vpcId } = req.query;
      const result = await describeRedshiftClusters(region, vpcId);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listRedshiftServerlessWorkgroups(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listRedshiftServerlessWorkgroups(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listRoles(req: any, res: any, next: any) {
    try {
      const { type, key } = req.query;
      const result = await listRoles(type, key);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listHostedZones(_req: any, res: any, next: any) {
    try {
      const result = await listHostedZones();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listWorkGroups(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listWorkGroups(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async athenaPing(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await athenaPing(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async mskPing(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await mskPing(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async quicksightPing(_req: any, res: any, next: any) {
    try {
      const result = await quickSightPing();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listQuickSightUsers(_req: any, res: any, next: any) {
    try {
      const result = await listQuickSightUsers();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async registerQuickSightUser(req: any, res: any, next: any) {
    try {
      const { email, username } = req.body;
      const result = await registerQuickSightUser(email, username);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeAccountSubscription(_req: any, res: any, next: any) {
    try {
      const result = await describeClickstreamAccountSubscription();
      if (!result) {
        return res.status(404).send(new ApiFail('QuickSight Unsubscription.'));
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async createAccountSubscription(req: any, res: any, next: any) {
    try {
      const { email, accountName } = req.body;
      const result = await createAccountSubscription(email, accountName);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async deleteAccountSubscription(_req: any, res: any, next: any) {
    try {
      const result = await deleteAccountSubscription();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listCertificates(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await ListCertificates(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listSecrets(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listSecrets(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async AssumeUploadRole(req: any, res: any, next: any) {
    try {
      const requestId = req.get('X-Click-Stream-Request-Id');
      const result = await AssumeUploadRole(requestId);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  checkPolicy(policyStr: string, principal: {key: string; value: string}, resource: string): boolean {
    try {
      const policy = JSON.parse(policyStr) as Policy;
      let match: boolean = false;
      for (let statement of policy.Statement as PolicyStatement[]) {
        if (statement.Effect === 'Allow' && statement.Principal && statement.Resource) {
          if (
            (typeof statement.Principal[principal.key] === 'string' &&
              statement.Principal[principal.key] === principal.value) ||
            (Array.prototype.isPrototypeOf(statement.Principal[principal.key]) &&
              (statement.Principal[principal.key] as string[]).indexOf(principal.value) > -1)
          ) {
            if (
              (typeof statement.Resource === 'string' &&
                statement.Resource === resource) ||
              (Array.prototype.isPrototypeOf(statement.Resource) &&
                (statement.Resource as string[]).indexOf(resource) > -1)
            ) {
              // find resource
              match = true;
            }
          }
        }
      }
      return match;
    } catch (error) {
      return false;
    }
  }

  public async fetch(req: any, res: any, _next: any) {
    try {
      const { url, method, body, headers } = req.body;
      const response = await fetch(url, {
        method: method,
        body: body,
        headers: headers,
      });
      const data = await response.text();
      return res.json(new ApiSuccess({
        ok: response.status < 500,
        status: response.status,
        data: data,
      }));
    } catch (error) {
      return res.json(new ApiSuccess({
        ok: false,
        status: 500,
        data: (error as Error).message,
      }));
    }
  }
}
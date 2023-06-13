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
import pLimit from 'p-limit';
import { validateEnableAccessLogsForALB } from '../common/stack-params-valid';
import { ApiFail, ApiSuccess } from '../common/types';
import { paginateData } from '../common/utils';
import { ListCertificates } from '../store/aws/acm';
import { agaPing } from '../store/aws/aga';
import { athenaPing, listWorkGroups } from '../store/aws/athena';
import { describeAlarmsByProjectId, disableAlarms, enableAlarms } from '../store/aws/cloudwatch';
import { describeVpcs, listRegions, describeSubnetsWithType, describeVpcs3AZ, describeVpcSecurityGroups } from '../store/aws/ec2';
import { emrServerlessPing } from '../store/aws/emr';
import { listRoles } from '../store/aws/iam';
import { listMSKCluster, mskPing } from '../store/aws/kafka';
import {
  describeClickstreamAccountSubscription,
  listQuickSightUsers,
  quickSightIsSubscribed, quickSightPing,
  registerQuickSightUser,
} from '../store/aws/quicksight';
import { describeRedshiftClusters, listRedshiftServerlessWorkgroups, redshiftServerlessPing } from '../store/aws/redshift';
import { listHostedZones } from '../store/aws/route53';
import { listBuckets } from '../store/aws/s3';
import { listSecrets } from '../store/aws/secretsmanager';
import { AssumeUploadRole } from '../store/aws/sts';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

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
      const {
        region,
        vpcId,
        subnetType,
      } = req.query;
      const result = await describeSubnetsWithType(region, vpcId, subnetType);
      result.sort((a, b) => {
        const fa = a.name.toLowerCase(), fb = b.name.toLowerCase();
        if (fa < fb) {
          return -1;
        }
        if (fa > fb) {
          return 1;
        }
        return 0;
      });
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  public async describeSecurityGroups(req: any, res: any, next: any) {
    try {
      const {
        region,
        vpcId,
      } = req.query;
      const result = await describeVpcSecurityGroups(region, vpcId);
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
      const {
        region,
        bucket,
      } = req.query;
      const check = await validateEnableAccessLogsForALB(region, bucket);
      return res.json(new ApiSuccess({ check }));
    } catch (error) {
      next(error);
    }
  }

  public async listMSKCluster(req: any, res: any, next: any) {
    try {
      const {
        region,
        vpcId,
      } = req.query;
      const result = await listMSKCluster(region, vpcId);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  public async describeRedshiftClusters(req: any, res: any, next: any) {
    try {
      const {
        region,
        vpcId,
      } = req.query;
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
      const {
        type,
        key,
      } = req.query;
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

  public async quickSightIsSubscribed(_req: any, res: any, next: any) {
    try {
      const result = await quickSightIsSubscribed();
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
      const {
        email,
        username,
      } = req.body;
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

  public async alarms(req: any, res: any, next: any) {
    try {
      const {
        pid,
        pageNumber,
        pageSize,
      } = req.query;
      const latestPipelines = await store.listPipeline(pid, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.json(new ApiSuccess({
          totalCount: -1,
          items: [],
        }));
      }
      const latestPipeline = latestPipelines[0];
      const result = await describeAlarmsByProjectId(latestPipeline.region, pid);
      return res.json(new ApiSuccess({
        totalCount: result.length,
        items: paginateData(result, true, pageSize, pageNumber),
      }));
    } catch (error) {
      next(error);
    }
  }

  public async alarmsDisable(req: any, res: any, next: any) {
    try {
      const {
        region,
        alarmNames,
      } = req.body;
      const result = await disableAlarms(region, alarmNames);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  public async alarmsEnable(req: any, res: any, next: any) {
    try {
      const {
        region,
        alarmNames,
      } = req.body;
      const result = await enableAlarms(region, alarmNames);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  public async servicesPing(req: any, res: any, next: any) {
    try {
      const {
        region,
        services,
      } = req.query;
      const result: any[] = [];
      if (services) {
        const serviceNames = services.split(',');
        const promisePool = pLimit(serviceNames.length);
        const reqs = [];
        for (let serviceName of serviceNames) {
          if (serviceName === 'emr-serverless') {
            reqs.push(
              promisePool(
                () => emrServerlessPing(region)
                  .then(available => {
                    result.push({
                      service: 'emr-serverless',
                      available: available,
                    });
                  },
                  )));
          } else if (serviceName === 'msk') {
            reqs.push(
              promisePool(
                () => mskPing(region)
                  .then(available => {
                    result.push({
                      service: 'msk',
                      available: available,
                    });
                  },
                  )));
          } else if (serviceName === 'redshift-serverless') {
            reqs.push(
              promisePool(
                () => redshiftServerlessPing(region)
                  .then(available => {
                    result.push({
                      service: 'redshift-serverless',
                      available: available,
                    });
                  },
                  )));
          } else if (serviceName === 'quicksight') {
            reqs.push(
              promisePool(
                () => quickSightPing(region)
                  .then(available => {
                    result.push({
                      service: 'quicksight',
                      available: available,
                    });
                  },
                  )));
          } else if (serviceName === 'athena') {
            reqs.push(
              promisePool(
                () => athenaPing(region)
                  .then(available => {
                    result.push({
                      service: 'athena',
                      available: available,
                    });
                  },
                  )));
          } else if (serviceName === 'global-accelerator') {
            result.push({
              service: 'global-accelerator',
              available: agaPing(region),
            });
          }
        }
        await Promise.all(reqs);
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  public async fetch(req: any, res: any, _next: any) {
    try {
      const {
        url,
        method,
        body,
        headers,
      } = req.body;
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
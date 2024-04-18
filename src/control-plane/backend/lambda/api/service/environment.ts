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

import { OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX, fetchRemoteUrl } from '@aws/clickstream-base-lib';
import pLimit from 'p-limit';
import { SDK_MAVEN_VERSION_API_LINK } from '../common/constants';
import { PipelineStackType } from '../common/model-ln';
import { ApiFail, ApiSuccess, FetchType } from '../common/types';
import { paginateData } from '../common/utils';
import { CPipeline } from '../model/pipeline';
import { ListCertificates } from '../store/aws/acm';
import { pingServiceResource } from '../store/aws/cloudformation';
import { describeAlarmsByProjectId, disableAlarms, enableAlarms } from '../store/aws/cloudwatch';
import { describeVpcs, listRegions, describeSubnetsWithType, describeVpcs3AZ, describeVpcSecurityGroups } from '../store/aws/ec2';
import { listRoles } from '../store/aws/iam';
import { listMSKCluster } from '../store/aws/kafka';
import {
  describeClickstreamAccountSubscription,
  listUsers,
  quickSightIsSubscribed,
} from '../store/aws/quicksight';
import { describeRedshiftClusters, listRedshiftServerlessWorkgroups } from '../store/aws/redshift';
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

  public async quickSightIsSubscribed(_req: any, res: any, next: any) {
    try {
      const result = await quickSightIsSubscribed();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  public async quickSightListUsers(_req: any, res: any, next: any) {
    try {
      const result = await listUsers();
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
        const promisePool = pLimit(3);
        const reqs = [];
        for (let serviceName of serviceNames) {
          reqs.push(
            promisePool(
              () => pingServiceResource(region, serviceName)
                .then(available => {
                  result.push({
                    service: serviceName,
                    available: available,
                  });
                },
                )));
        }
        await Promise.all(reqs);
      }
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }

  private async getUrlFromPipeline(type:FetchType, projectId:string, pipelineId:string) {
    let url = '';
    const latestPipeline = await store.getPipeline(projectId, pipelineId);
    if (!latestPipeline) {
      return url;
    }
    const pipeline = new CPipeline(latestPipeline);
    if (type === FetchType.PIPELINE_ENDPOINT) {
      const ingestionOutputs = pipeline.getStackOutputBySuffixes(
        PipelineStackType.INGESTION,
        [
          OUTPUT_INGESTION_SERVER_URL_SUFFIX,
        ],
      );
      url = ingestionOutputs.get(OUTPUT_INGESTION_SERVER_URL_SUFFIX) ?? '';
    } else if (type === FetchType.PIPELINE_DNS) {
      const ingestionOutputs = pipeline.getStackOutputBySuffixes(
        PipelineStackType.INGESTION,
        [
          OUTPUT_INGESTION_SERVER_DNS_SUFFIX,
        ],
      );
      const dns = ingestionOutputs.get(OUTPUT_INGESTION_SERVER_DNS_SUFFIX);
      url = dns ? `http://${dns}` : '';
    } else {
      const domainName = latestPipeline.ingestionServer.domain?.domainName;
      url = domainName ? `https://${domainName}` : '';
    }
    return url;
  }

  public async fetch(req: any, res: any, _next: any) {
    try {
      const {
        type,
        projectId,
        pipelineId,
      } = req.body;
      let url = '';
      if (type === FetchType.ANDROIDSDK) {
        url = SDK_MAVEN_VERSION_API_LINK;
      } else {
        url = await this.getUrlFromPipeline(type, projectId, pipelineId);
      }
      const response = await fetchRemoteUrl(url);
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
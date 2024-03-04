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

import { CredentialsResponse, DescribeQuickSightSubscriptionResponse, DomainAvailableRequest, DomainAvailableResponse, FetchType, ListACMCertificatesRequest, ListACMCertificatesResponse, ListAlarmsRequest, ListAlarmsResponse, ListBucketsRequest, ListBucketsResponse, ListMSKClustersRequest, ListMSKClustersResponse, ListRedshiftClustersRequest, ListRedshiftClustersResponse, ListRedshiftServerlessWorkGroupsRequest, ListRedshiftServerlessWorkGroupsResponse, ListRegionsResponse, ListRolesRequest, ListRolesResponse, ListSSMSecretsRequest, ListSSMSecretsResponse, ListSecurityGroupsRequest, ListSecurityGroupsResponse, ListSubnetsRequest, ListSubnetsResponse, ListVpcRequest, ListVpcResponse, OUTPUT_INGESTION_SERVER_DNS_SUFFIX, OUTPUT_INGESTION_SERVER_URL_SUFFIX, ServicesAvailableRequest, ServicesAvailableResponse, SubnetType, UpdateAlarmsRequest } from '@aws/clickstream-base-lib';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import { SDK_MAVEN_VERSION_API_LINK } from '../common/constants';
import { PipelineStackType } from '../common/model-ln';
import { httpsAgent } from '../common/sdk-client-config-ln';
import { ApiSuccess, AssumeRoleType } from '../common/types';
import { paginateData } from '../common/utils';
import { CPipeline } from '../model/pipeline';
import { ListCertificates } from '../store/aws/acm';
import { pingServiceResource } from '../store/aws/cloudformation';
import { describeAlarmsByProjectId, disableAlarms, enableAlarms } from '../store/aws/cloudwatch';
import { describeVpcs, listRegions, describeSubnetsWithType, describeVpcSecurityGroups } from '../store/aws/ec2';
import { listRoles } from '../store/aws/iam';
import { listMSKCluster } from '../store/aws/kafka';
import {
  describeAccountSubscription,
} from '../store/aws/quicksight';
import { describeRedshiftClusters, listRedshiftServerlessWorkgroups } from '../store/aws/redshift';
import { listBuckets } from '../store/aws/s3';
import { listSecrets } from '../store/aws/secretsmanager';
import { AssumeUploadRole } from '../store/aws/sts';
import { ClickStreamStore } from '../store/click-stream-store';
import { DynamoDbStore } from '../store/dynamodb/dynamodb-store';

const store: ClickStreamStore = new DynamoDbStore();

export class EnvironmentServ {

  public async listRegions(_req: any, res: any, next: any) {
    try {
      const response: ListRegionsResponse = await listRegions();
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async describeVpcs(req: any, res: any, next: any) {
    try {
      const request: ListVpcRequest = req.query;
      const response: ListVpcResponse = await describeVpcs(request.region);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async describeSubnets(req: any, res: any, next: any) {
    try {
      const request: ListSubnetsRequest = {
        ...req.query,
        ...req.params,
      };
      const subnets = await describeSubnetsWithType(request.region, request.vpcId, request.subnetType ?? SubnetType.ALL);
      const response: ListSubnetsResponse = [];
      for (let subnet of subnets) {
        response.push({
          SubnetId: subnet.id,
          Name: subnet.name,
          CidrBlock: subnet.cidr,
          AvailabilityZone: subnet.availabilityZone,
          Type: subnet.type,
        });
      }
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async describeSecurityGroups(req: any, res: any, next: any) {
    try {
      const request: ListSecurityGroupsRequest = {
        ...req.query,
        ...req.params,
      };
      const response: ListSecurityGroupsResponse = await describeVpcSecurityGroups(request.region, request.vpcId);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async listBuckets(req: any, res: any, next: any) {
    try {
      const request: ListBucketsRequest = req.query;
      const response: ListBucketsResponse = await listBuckets(request.region);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async listMSKCluster(req: any, res: any, next: any) {
    try {
      const request: ListMSKClustersRequest = req.query;
      const response: ListMSKClustersResponse = await listMSKCluster(request.region, request.vpcId);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async describeRedshiftClusters(req: any, res: any, next: any) {
    try {
      const request: ListRedshiftClustersRequest = req.query;
      const response: ListRedshiftClustersResponse = await describeRedshiftClusters(request.region, request.vpcId);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async listRedshiftServerlessWorkGroups(req: any, res: any, next: any) {
    try {
      const request: ListRedshiftServerlessWorkGroupsRequest = req.query;
      const response: ListRedshiftServerlessWorkGroupsResponse = await listRedshiftServerlessWorkgroups(request.region);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async listRoles(req: any, res: any, next: any) {
    try {
      const request: ListRolesRequest = req.query;
      let response: ListRolesResponse;
      if (request.service) {
        response = await listRoles(AssumeRoleType.SERVICE, request.service);
      } else if (request.account) {
        response = await listRoles(AssumeRoleType.ACCOUNT, request.account);
      } else {
        response = await listRoles(AssumeRoleType.ALL);
      }
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async describeAccountSubscription(_req: any, res: any, next: any) {
    try {
      let response: DescribeQuickSightSubscriptionResponse = await describeAccountSubscription();
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async listCertificates(req: any, res: any, next: any) {
    try {
      const request: ListACMCertificatesRequest = req.query;
      const response: ListACMCertificatesResponse = await ListCertificates(request.region);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async listSecrets(req: any, res: any, next: any) {
    try {
      const request: ListSSMSecretsRequest = req.query;
      const response: ListSSMSecretsResponse = await listSecrets(request.region);
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async AssumeUploadRole(req: any, res: any, next: any) {
    try {
      const requestId = req.get('X-Click-Stream-Request-Id');
      const response: CredentialsResponse = await AssumeUploadRole(requestId) as CredentialsResponse;
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async alarms(req: any, res: any, next: any) {
    try {
      const request: ListAlarmsRequest = req.query;
      const latestPipelines = await store.listPipeline(request.projectId, 'latest', 'asc');
      if (latestPipelines.length === 0) {
        return res.json(new ApiSuccess({
          totalCount: -1,
          items: [],
        }));
      }
      const latestPipeline = latestPipelines[0];
      const alarms = await describeAlarmsByProjectId(latestPipeline.region, request.projectId);
      const response: ListAlarmsResponse = {
        totalCount: alarms.length,
        items: paginateData(alarms, true, request.pageSize ?? 10, request.pageNumber ?? 1),
      };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  public async alarmsUpdate(req: any, res: any, next: any) {
    try {
      const request: UpdateAlarmsRequest = req.body;
      if (request.enabled) {
        await enableAlarms(request.region, request.alarmNames);
        return res.json(new ApiSuccess('Alarms enabled.'));
      }
      await disableAlarms(request.region, request.alarmNames);
      return res.json(new ApiSuccess('Alarms disabled.'));
    } catch (error) {
      next(error);
    }
  }

  public async servicesPing(req: any, res: any, next: any) {
    try {
      const request: ServicesAvailableRequest = req.query;
      const response: ServicesAvailableResponse = [];
      if (request.services) {
        const serviceNames = request.services.split(',');
        const promisePool = pLimit(3);
        const reqs = [];
        for (let serviceName of serviceNames) {
          reqs.push(
            promisePool(
              () => pingServiceResource(request.region, serviceName)
                .then(available => {
                  response.push({
                    service: serviceName,
                    available: available,
                  });
                },
                )));
        }
        await Promise.all(reqs);
      }
      return res.json(new ApiSuccess(response));
    } catch (error) {
      next(error);
    }
  }

  private async getUrlFromPipeline(type:FetchType, projectId:string) {
    let url = '';
    const latestPipelines = await store.listPipeline(projectId, 'latest', 'asc');
    if (latestPipelines.length === 0) {
      return url;
    }
    const latestPipeline = latestPipelines[0];
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
      const request: DomainAvailableRequest = req.query;
      let url = '';
      if (request.type === FetchType.ANDROIDSDK) {
        url = SDK_MAVEN_VERSION_API_LINK;
      } else {
        url = await this.getUrlFromPipeline(request.type, request.projectId ?? '');
      }
      const fetchResponse = await fetch(url, {
        method: 'GET',
        agent: httpsAgent,
      });
      const data = await fetchResponse.text();
      const response: DomainAvailableResponse = {
        ok: fetchResponse.status < 500,
        status: fetchResponse.status,
        data: data,
      };
      return res.json(new ApiSuccess(response));
    } catch (error) {
      return res.json(new ApiSuccess({
        ok: false,
        status: 500,
        data: (error as Error).message,
      }));
    }
  }
}
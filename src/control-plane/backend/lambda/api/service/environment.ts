/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { ApiSuccess } from '../common/request-valid';
import { listRegions } from '../store/aws/account';
import { describeVpcs, describeSubnets } from '../store/aws/ec2';
import { listMSKCluster } from '../store/aws/kafka';
import { listQuickSightUsers } from '../store/aws/quicksight';
import { describeRedshiftClusters } from '../store/aws/redshift';
import { listBuckets } from '../store/aws/s3';

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
  public async describeSubnets(req: any, res: any, next: any) {
    try {
      const { region, vpcId, subnetType } = req.query;
      const result = await describeSubnets(region, vpcId, subnetType);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listBuckets(_req: any, res: any, next: any) {
    try {
      const result = await listBuckets();
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async listMSKCluster(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await listMSKCluster(region);
      return res.json(new ApiSuccess(result));
    } catch (error) {
      next(error);
    }
  }
  public async describeRedshiftClusters(req: any, res: any, next: any) {
    try {
      const { region } = req.query;
      const result = await describeRedshiftClusters(region);
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
}
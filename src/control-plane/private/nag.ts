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

import { CfnResource, IAspect } from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { IConstruct } from 'constructs';
import { CfnNagMetadata } from '../../common/cfn-nag';
import { Constant } from './constant';

export class CfnNagWhitelistForS3BucketDelete implements IAspect {
  public visit(construct: IConstruct): void {
    if (construct.node.id.indexOf('S3AutoDeleteObjectsCustomResourceProvider') >=0 ) {
      const res = construct.node.tryFindChild('Handler');
      if (res !== undefined) {
        const fnRes = res as CfnResource;
        const fnSuppress = (fnRes?.getMetadata('cfn_nag') as CfnNagMetadata)?.rules_to_suppress || [];

        fnRes.addMetadata('cfn_nag', {
          rules_to_suppress: [
            {
              id: 'W89', //Lambda functions should be deployed inside a VPC
              reason: Constant.NAG_REASON_CDK_S3_BUCKET_MANAGED_FUN,
            },
            {
              id: 'W92', //Lambda functions should define ReservedConcurrentExecutions to reserve simultaneous executions
              reason: Constant.NAG_REASON_CDK_S3_BUCKET_MANAGED_FUN,
            },
            ...fnSuppress,
          ],
        });
      }
    }
  }
}

export class CfnNagWhitelistForBucketDeployment implements IAspect {
  public visit(construct: IConstruct): void {

    if (construct instanceof Function && (construct.node.id.indexOf('CDKBucketDeployment') >=0
       || construct.node.id.indexOf('CustomS3AutoDeleteObjects') >=0 ) ) {
      const fnRes = construct.node.defaultChild as CfnResource;
      const fnSuppress = (fnRes?.getMetadata('cfn_nag') as CfnNagMetadata)?.rules_to_suppress || [];

      fnRes.addMetadata('cfn_nag', {
        rules_to_suppress: [
          {
            id: 'W89', //Lambda functions should be deployed inside a VPC
            reason: Constant.NAG_REASON_CDK_BUCKETDEPLOYMENT_MANAGED_FUN,
          },
          {
            id: 'W92', //Lambda functions should define ReservedConcurrentExecutions to reserve simultaneous executions
            reason: Constant.NAG_REASON_CDK_BUCKETDEPLOYMENT_MANAGED_FUN,
          },
          ...fnSuppress,
        ],
      });
    }

    if (construct.node.id.indexOf('CDKBucketDeployment') >=0 ) {
      const roleRes = construct.node.tryFindChild('ServiceRole')?.node.tryFindChild('DefaultPolicy')?.node.defaultChild as CfnResource;
      const roleSuppress = (roleRes?.getMetadata('cfn_nag') as CfnNagMetadata)?.rules_to_suppress || [];
      roleRes?.addMetadata('cfn_nag', {
        rules_to_suppress: [
          {
            id: 'W12',
            reason: Constant.NAG_REASON_WILDCARD_REQUIRED_CERT_REQUEST_FUN,
          },
          ...roleSuppress,
        ],
      });
    }

    if (construct instanceof Function && construct.node.id === 'CertificateRequestorFunction') {
      const fnRes = construct.node.defaultChild as CfnResource;
      const fnSuppress = (fnRes?.getMetadata('cfn_nag') as CfnNagMetadata)?.rules_to_suppress || [];
      fnRes?.addMetadata('cfn_nag', {
        rules_to_suppress: [
          {
            id: 'W89', //Lambda functions should be deployed inside a VPC
            reason: Constant.NAG_REASON_CERT_VALIDATION_MANAGED_FUN,
          },
          {
            id: 'W92', //Lambda functions should define ReservedConcurrentExecutions to reserve simultaneous executions
            reason: Constant.NAG_REASON_CERT_VALIDATION_MANAGED_FUN,
          },
          ...fnSuppress,
        ],
      });

      const roleRes = construct.node.tryFindChild('ServiceRole')?.node.tryFindChild('DefaultPolicy')?.node.defaultChild as CfnResource;
      const roleSuppress = (roleRes?.getMetadata('cfn_nag') as CfnNagMetadata)?.rules_to_suppress || [];
      roleRes?.addMetadata('cfn_nag', {
        rules_to_suppress: [
          {
            id: 'W12',
            reason: Constant.NAG_REASON_WILDCARD_REQUIRED_CERT_REQUEST_FUN,
          },
          ...roleSuppress,
        ],
      });
    }
  }
}

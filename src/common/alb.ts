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


import { Aws, CfnMapping } from 'aws-cdk-lib';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AccountPrincipal, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IBucket, Bucket } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { ALBLogServiceAccountMapping } from './constant';
import { AuthenticationProps } from './model';

export interface LogProps {
  readonly enableAccessLog: boolean;
  readonly bucket?: IBucket;
  readonly prefix?: string;
}

export function createAuthenticationPropsFromSecretArn(
  scope: Construct,
  authenticationSecretArn: string,
) {
  const authSecret = Secret.fromSecretCompleteArn(scope, 'ImportedSecret', authenticationSecretArn);
  const authenticationProps : AuthenticationProps = {
    issuer: authSecret.secretValueFromJson('issuer').toString(),
    userEndpoint: authSecret.secretValueFromJson('userEndpoint').toString(),
    authorizationEndpoint: authSecret.secretValueFromJson('authorizationEndpoint').toString(),
    tokenEndpoint: authSecret.secretValueFromJson('tokenEndpoint').toString(),
    appClientId: authSecret.secretValueFromJson('appClientId').toString(),
    appClientSecret: authSecret.secretValueFromJson('appClientSecret').toString(),
  };
  return authenticationProps;
}

export function setAccessLogForApplicationLoadBalancer(
  scope: Construct,
  props: {
    alb: ApplicationLoadBalancer;
    albLogBucket: IBucket;
    albLogPrefix: string;
  },
) {
  createBucketPolicyForAlbAccessLog(scope, {
    albLogBucket: props.albLogBucket,
    albLogPrefix: props.albLogPrefix,
  });

  props.alb.setAttribute('access_logs.s3.enabled', 'true');
  props.alb.setAttribute(
    'access_logs.s3.bucket',
    props.albLogBucket.bucketName,
  );
  props.alb.setAttribute('access_logs.s3.prefix', `${props.albLogPrefix}alb-log`);
}

export function createBucketPolicyForAlbAccessLog(
  scope: Construct,
  props: {
    albLogBucket: IBucket;
    albLogPrefix: string;
  },
) {
  if (props.albLogBucket instanceof Bucket) {
    const albLogServiceAccountMapping = new CfnMapping(
      scope,
      'ALBServiceAccountMapping',
      ALBLogServiceAccountMapping,
    );

    const albAccountId = albLogServiceAccountMapping.findInMap(
      Aws.REGION,
      'account',
    );

    // the grantPut does not work if the bucket is not created in the same stack, e.g: Bucket.fromBucketName
    props.albLogBucket.grantPut(
      {
        grantPrincipal: new AccountPrincipal(albAccountId),
      },
      `${props.albLogPrefix}*`,
    );

    props.albLogBucket.grantPut(
      {
        grantPrincipal: new ServicePrincipal(
          'logdelivery.elasticloadbalancing.amazonaws.com',
        ),
      },
      `${props.albLogPrefix}*`,
    );
  }
}

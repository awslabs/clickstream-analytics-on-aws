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


import { Aws, CfnCondition, CfnMapping, CfnResource, Fn } from 'aws-cdk-lib';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AccountPrincipal, PolicyStatement, ServicePrincipal, Effect, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { IBucket, Bucket, BucketPolicy } from 'aws-cdk-lib/aws-s3';
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

    const albAccountsInRegion = new CfnCondition(scope, 'ALBAccountsInRegion', {
      expression: Fn.conditionOr(
        ...Object.keys(ALBLogServiceAccountMapping.mapping).map(r =>
          Fn.conditionEquals(Aws.REGION, r)),
      ),
    });

    // the grantPut does not work if the bucket is not created in the same stack, e.g: Bucket.fromBucketName
    const grant = props.albLogBucket.grantPut(
      {
        grantPrincipal: new AccountPrincipal(albAccountId),
      },
      `${props.albLogPrefix}*`,
    );
    (props.albLogBucket.policy?.node.defaultChild as CfnResource).cfnOptions.condition
      = albAccountsInRegion;

    const albAccountsNotInRegion = new CfnCondition(scope, 'ALBAccountsNotInRegion', {
      expression: Fn.conditionNot(albAccountsInRegion),
    });

    const bucketPolicy = new BucketPolicy(scope, 'ALBLogDeliveryPolicy', {
      bucket: props.albLogBucket,
    });
    bucketPolicy.document.addStatements(
      new PolicyStatement({
        actions: ['s3:*'],
        conditions: {
          Bool: { 'aws:SecureTransport': 'false' },
        },
        effect: Effect.DENY,
        resources: [
          props.albLogBucket.bucketArn,
          props.albLogBucket.arnForObjects('*'),
        ],
        principals: [new AnyPrincipal()],
      }),
      new PolicyStatement({
        actions: grant.resourceStatement!.actions,
        principals: [
          new ServicePrincipal(
            'logdelivery.elasticloadbalancing.amazonaws.com',
          ),
        ],
        resources: grant.resourceStatement!.resources,
      }),
    );
    (bucketPolicy.node.defaultChild as CfnResource).cfnOptions.condition = albAccountsNotInRegion;
  }
}

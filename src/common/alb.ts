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
import { Construct } from 'constructs';

export interface LogProps {
  readonly enableAccessLog: boolean;
  readonly bucket?: IBucket;
  readonly prefix?: string;
}

/**
* check mapping from doc https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/enable-access-logs.html#attach-bucket-policy
*/

const ALBLogServiceAccountMapping = {
  mapping: {
    'me-south-1': {
      account: '076674570225',
    },
    'eu-south-1': {
      account: '635631232127',
    },
    'ap-northeast-1': {
      account: '582318560864',
    },
    'ap-northeast-2': {
      account: '600734575887',
    },
    'ap-northeast-3': {
      account: '383597477331',
    },
    'ap-south-1': {
      account: '718504428378',
    },
    'ap-southeast-1': {
      account: '114774131450',
    },
    'ap-southeast-2': {
      account: '783225319266',
    },
    'ca-central-1': {
      account: '985666609251',
    },
    'eu-central-1': {
      account: '054676820928',
    },
    'eu-north-1': {
      account: '897822967062',
    },
    'eu-west-1': {
      account: '156460612806',
    },
    'eu-west-2': {
      account: '652711504416',
    },
    'eu-west-3': {
      account: '009996457667',
    },
    'sa-east-1': {
      account: '507241528517',
    },
    'us-east-1': {
      account: '127311923021',
    },
    'us-east-2': {
      account: '033677994240',
    },
    'us-west-1': {
      account: '027434742980',
    },
    'us-west-2': {
      account: '797873946194',
    },
    'ap-east-1': {
      account: '754344448648',
    },
    'af-south-1': {
      account: '098369216593',
    },
    'ap-southeast-3': {
      account: '589379963580',
    },
    'cn-north-1': {
      account: '638102146993',
    },
    'cn-northwest-1': {
      account: '037604701340',
    },
  },
};

export function setAccessLogForApplicationLoadBalancer(
  scope: Construct,
  props: {
    alb: ApplicationLoadBalancer;
    albLogBucket: IBucket;
    albLogPrefix: string;
  },
) {
  createBucketPolicyForAlbAccessLog(scope, {
    alb: props.alb,
    albLogBucket: props.albLogBucket,
    albLogPrefix: props.albLogPrefix,
  });

  props.alb.setAttribute('access_logs.s3.enabled', 'true');
  props.alb.setAttribute(
    'access_logs.s3.bucket',
    props.albLogBucket.bucketName,
  );
  props.alb.setAttribute('access_logs.s3.prefix', props.albLogPrefix);
}

export function createBucketPolicyForAlbAccessLog(
  scope: Construct,
  props: {
    alb: ApplicationLoadBalancer;
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
      `${props.albLogPrefix}/*`,
    );

    props.albLogBucket.grantPut(
      {
        grantPrincipal: new ServicePrincipal(
          'logdelivery.elasticloadbalancing.amazonaws.com',
        ),
      },
      `${props.albLogPrefix}/*`,
    );
  }
}

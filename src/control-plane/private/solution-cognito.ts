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

import { Aws, CfnRule, Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import {
  UserPool,
  CfnUserPoolUser,
  AdvancedSecurityMode,
  UserPoolClient,
  OAuthScope,
} from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { getShortIdOfStack } from '../../common/stack';

export interface OIDCProps {
  issuer: string;
  tokenEndpoint: string;
  userEndpoint: string;
  authorizationEndpoint: string;
  appClientId: string;
}

export interface SolutionCognitoProps {
  email: string;
  callbackUrls?: string[];
}

export class SolutionCognito extends Construct {

  public readonly oidcProps: OIDCProps;

  constructor(scope: Construct, id: string, props: SolutionCognitoProps) {
    super(scope, id);
    const stackId = getShortIdOfStack(Stack.of(scope));

    new CfnRule(scope, 'CognitoUnsupportRegionRule', {
      assertions: [
        {
          assert:
            Fn.conditionOr(
              Fn.conditionEquals(Aws.REGION, 'us-east-1'),
              Fn.conditionEquals(Aws.REGION, 'us-east-2'),
              Fn.conditionEquals(Aws.REGION, 'us-west-1'),
              Fn.conditionEquals(Aws.REGION, 'us-west-2'),
              Fn.conditionEquals(Aws.REGION, 'ca-central-1'),
              Fn.conditionEquals(Aws.REGION, 'sa-east-1'),
              Fn.conditionEquals(Aws.REGION, 'eu-west-1'),
              Fn.conditionEquals(Aws.REGION, 'eu-west-2'),
              Fn.conditionEquals(Aws.REGION, 'eu-west-3'),
              Fn.conditionEquals(Aws.REGION, 'eu-central-1'),
              Fn.conditionEquals(Aws.REGION, 'ap-northeast-1'),
              Fn.conditionEquals(Aws.REGION, 'ap-northeast-2'),
              Fn.conditionEquals(Aws.REGION, 'ap-southeast-1'),
              Fn.conditionEquals(Aws.REGION, 'ap-southeast-2'),
              Fn.conditionEquals(Aws.REGION, 'ap-south-1'),
              Fn.conditionEquals(Aws.REGION, 'eu-north-1'),
              Fn.conditionEquals(Aws.REGION, 'me-south-1'),
            ),

          assertDescription:
            'Cognito is not supported in current region. Please use correct CloudFormation template and try again.',
        },
      ],
    });

    const userPool = new UserPool(scope, 'userPool', {
      selfSignUpEnabled: false,
      signInCaseSensitive: false,
      removalPolicy: RemovalPolicy.DESTROY,
      signInAliases: {
        email: true,
      },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      advancedSecurityMode: AdvancedSecurityMode.ENFORCED,
      userInvitation: {
        emailSubject: 'Welcome to use Clickstream Analytics on AWS solution',
        emailBody: 'Hello {username}, your temporary password for ClickStream Analytics on AWS Solution is {####}',
      },
    });

    // Create User Pool Client
    const userPoolClient = new UserPoolClient(scope, 'clickstream-backend-client', {
      userPool: userPool,
      preventUserExistenceErrors: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls: props.callbackUrls,
      },
    });

    const userPoolId = userPool.userPoolId;
    const domainPrefix = Fn.join('', ['clickstream', stackId]);
    userPool.addDomain('cognito-domain', {
      cognitoDomain: {
        domainPrefix,
      },
    });

    new CfnUserPoolUser(scope, 'backend-user', {
      userPoolId,
      userAttributes: [
        {
          name: 'email',
          value: props.email,
        },
      ],
      username: props.email,
    });

    const region = Stack.of(scope).region;
    this.oidcProps = {
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
      tokenEndpoint: `https://${domainPrefix}.auth.${region}.amazoncognito.com/oauth2/token`,
      userEndpoint: `https://${domainPrefix}.auth.${region}.amazoncognito.com/oauth2/userInfo`,
      authorizationEndpoint: `https://${domainPrefix}.auth.${region}.amazoncognito.com/oauth2/authorize`,
      appClientId: userPoolClient.userPoolClientId,
    };
  };

}

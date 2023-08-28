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

import { join } from 'path';
import { Duration, CustomResource } from 'aws-cdk-lib';
import { Runtime, Function } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { createLambdaRole } from '../../common/lambda';
import { attachListTagsPolicyForFunction } from '../../common/lambda/tags';
import { POWERTOOLS_ENVS } from '../../common/powertools';

export interface AddAdminUserProps {
  readonly email: string;
  readonly userTableName: string;
}

export class AddAdminUser extends Construct {

  readonly crForAddAdminUser: CustomResource;

  constructor(scope: Construct, id: string, props: AddAdminUserProps) {
    super(scope, id);

    this.crForAddAdminUser = this.createAddAdminUserCustomResource(props);
  }

  private createAddAdminUserCustomResource(props: AddAdminUserProps): CustomResource {
    const fn = this.createAddAdminUserLambda();

    const provider = new Provider(
      this,
      'AddAdminUserCustomResourceProvider',
      {
        onEventHandler: fn,
        logRetention: RetentionDays.FIVE_DAYS,
      },
    );

    const cr = new CustomResource(this, 'AddAdminUserCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        Email: props.email,
        UserTableName: props.userTableName,
      },
    });

    return cr;
  }

  private createAddAdminUserLambda(): Function {
    const lambdaRootPath = __dirname + '/lambda/add-admin-user';

    const fn = new NodejsFunction(this, 'AddAdminUserFn', {
      runtime: Runtime.NODEJS_18_X,
      entry: join(
        lambdaRootPath,
        'index.ts',
      ),
      handler: 'handler',
      memorySize: 128,
      reservedConcurrentExecutions: 1,
      timeout: Duration.minutes(5),
      logRetention: RetentionDays.ONE_WEEK,
      role: createLambdaRole(this, 'AddAdminUserRole', false, []),
      environment: {
        ... POWERTOOLS_ENVS,
      },
    });

    attachListTagsPolicyForFunction(this, 'AddAdminUserFn', fn);

    return fn;
  }
}

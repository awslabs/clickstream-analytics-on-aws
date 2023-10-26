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

import { Application } from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import { Aws, CfnCondition, CfnOutput, CfnParameter, CfnResource, Fn, Stack, Tags } from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib/core/lib/stack';
import { Construct } from 'constructs';
import { OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_ARN } from './common/constant';
import { SolutionInfo } from './common/solution-info';

export interface ServiceCatalogAppRegistryProps extends StackProps {
}

export class ServiceCatalogAppregistryStack extends Stack {
  constructor(scope: Construct, id: string, props?: ServiceCatalogAppRegistryProps) {
    super(scope, id, props);

    const featureName = 'AppRegistry';
    this.templateOptions.description = `(${SolutionInfo.SOLUTION_ID}-appreg ${SolutionInfo.SOLUTION_NAME} - ${featureName} ${SolutionInfo.SOLUTION_VERSION_DETAIL}`;

    const projectIdParam = new CfnParameter(this, 'ProjectId', {
      description: 'Project Id',
      type: 'String',
      default: '',
    });

    const serviceAvailableRegion = new CfnCondition(this, 'ServiceCatalogAvailableRegion', {
      expression: Fn.conditionOr(
        Fn.conditionEquals(Aws.REGION, 'us-east-1'),
        Fn.conditionEquals(Aws.REGION, 'us-east-2'),
        Fn.conditionEquals(Aws.REGION, 'us-west-1'),
        Fn.conditionEquals(Aws.REGION, 'us-west-2'),
        Fn.conditionEquals(Aws.REGION, 'ap-south-1'),
        Fn.conditionEquals(Aws.REGION, 'ap-northeast-1'),
        Fn.conditionEquals(Aws.REGION, 'ap-northeast-2'),
        Fn.conditionEquals(Aws.REGION, 'ap-northeast-3'),
        Fn.conditionEquals(Aws.REGION, 'ap-southeast-1'),
        Fn.conditionEquals(Aws.REGION, 'ap-southeast-2'),
        Fn.conditionEquals(Aws.REGION, 'ca-central-1'),
        Fn.conditionEquals(Aws.REGION, 'eu-central-1'),
        Fn.conditionEquals(Aws.REGION, 'eu-west-1'),
        Fn.conditionEquals(Aws.REGION, 'eu-west-2'),
        Fn.conditionEquals(Aws.REGION, 'eu-west-3'),
        Fn.conditionEquals(Aws.REGION, 'eu-north-1'),
        Fn.conditionEquals(Aws.REGION, 'sa-east-1'),
      ),
    });

    const application = new Application(this, 'ServiceCatalogApplication', {
      applicationName: Fn.join('-', [
        'clickstream-analytics',
        projectIdParam.valueAsString,
        Aws.REGION,
        Aws.ACCOUNT_ID,
      ]),
      description: `Catalog Service AppRegistry application for Clickstream Analytics project: ${projectIdParam.valueAsString}`,
    });
    // Add condition for region validation
    (application.node.defaultChild as CfnResource).cfnOptions.condition = serviceAvailableRegion;

    // Add tags for AppRegistry application
    Tags.of(application).add('Solutions:SolutionID', SolutionInfo.SOLUTION_ID);
    Tags.of(application).add('Solutions:SolutionName', SolutionInfo.SOLUTION_NAME);
    Tags.of(application).add('Solutions:SolutionVersion', SolutionInfo.SOLUTION_VERSION);
    Tags.of(application).add('Solutions:ApplicationType', 'AWS-Solutions');

    new CfnOutput(this, OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_ARN, {
      description: 'Service Catalog AppRegistry Application Arn',
      value: application ? application.applicationArn : '',
      condition: serviceAvailableRegion,
    });
  }
}

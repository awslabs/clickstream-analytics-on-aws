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

import {
  Logger,
} from '@aws-lambda-powertools/logger';
import { App, Fn } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SubnetSelection, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RedshiftAnalyticsStack } from '../../../src/analytics/analytics-on-redshift';
import { RedshiftMode } from '../../../src/analytics/private/constant';
import { DataAnalyticsRedshiftStack } from '../../../src/data-analytics-redshift-stack';

const logger = new Logger();

function findResourceByCondition(template: Template, condition: string) {
  const allResources = template.toJSON().Resources;
  for (const key of Object.keys(allResources)) {
    const resource = allResources[key];
    if (resource.Condition == condition) {
      return resource;
    }
  }
  return;
}

describe('AnalyticsHotDataStack common parameter test', () => {
  const app = new App();
  const testId = 'test-1';
  const stack = new DataAnalyticsRedshiftStack(app, testId+'-data-analytics-redshift-stack-serverless', {});
  const template = Template.fromStack(stack);

  beforeEach(() => {
  });

  test('Should has Parameter VpcId', () => {
    template.hasParameter('VpcId', {
      Type: 'AWS::EC2::VPC::Id',
    });
  });

  test('Should has Parameter RedshiftMode', () => {
    template.hasParameter('RedshiftMode', {
      Type: 'String',
    });
  });

  test('Should has ParameterGroups and ParameterLabels', () => {
    const cfnInterface =
      template.toJSON().Metadata['AWS::CloudFormation::Interface'];
    expect(cfnInterface.ParameterGroups).toBeDefined();

    const paramCount = Object.keys(cfnInterface.ParameterLabels).length;
    expect(paramCount).toEqual(18);
  });

  test('Conditions are created as expected', () => {
    const conditionObj = template.toJSON().Conditions;
    logger.info(JSON.stringify(conditionObj));
    const allConditions = Object.keys(conditionObj)
      .filter((ck) => ck.startsWith('redshift'))
      .map((ck) => {
        logger.info(conditionObj[ck]['Fn::Equals']);
        return {
          cItems: (conditionObj[ck]['Fn::Equals'] as any[]).map(
            (it) => it,
          ),
          cKey: ck,
        };
      });
    logger.info('allConditions:'+JSON.stringify(allConditions));
    var conditionNum = 0;
    for (const c of allConditions) {
      if ((c.cKey as string) == 'redshiftServerless') {
        conditionNum++;
      } else if ((c.cKey as string) == 'redshiftProvisioned') {
        conditionNum++;
      } else {
        conditionNum;
      }
    };
    expect(conditionNum).toEqual(2);
  });

  test('ProjectId pattern', () => {
    const param = template.toJSON().Parameters.ProjectId;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      '192_169_1_1',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('AppIds pattern', () => {
    const param = template.toJSON().Parameters.AppIds;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      '192_169_1_1',
      '192-169-1-1',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RedshiftMode allowedValues', () => {
    const param = template.toJSON().Parameters.RedshiftMode;
    const allowedValues = param.AllowedValues;
    expect(allowedValues.length).toEqual(2);
    for (const v of allowedValues) {
      expect(v == RedshiftMode.SERVERLESS || v == RedshiftMode.PROVISIONED).toBeTruthy();
    };
  });

  test('Should has parameter LoadJobScheduleInterval', () => {
    template.hasParameter('LoadJobScheduleInterval', {
      Type: 'Number',
    });
  });

  test('Should has parameter MaxFilesLimit', () => {
    template.hasParameter('MaxFilesLimit', {
      Type: 'Number',
    });
  });

  test('Should has parameter ProcessingFilesLimit', () => {
    template.hasParameter('ProcessingFilesLimit', {
      Type: 'Number',
    });
  });


});

describe('DataAnalyticsRedshiftStack serverless parameter test', () => {
  const app = new App();
  const testId = 'test-2';
  const stack = new DataAnalyticsRedshiftStack(app, testId+'-data-analytics-redshift-stack-serverless', {});
  const template = Template.fromStack(stack);
  var count = 1;

  // Vpc
  const vpc = Vpc.fromVpcAttributes(stack, testId+'-from-vpc-for-redshift', {
    vpcId: 'vpc-1',
    availabilityZones: Fn.getAzs(),
    privateSubnetIds: Fn.split(',', 'subnet-1,subnet-2,subnet-3'),
  });

  const subnetSelection: SubnetSelection = {
    subnets: vpc.privateSubnets,
  };

  const sinkS3Bucket = Bucket.fromBucketName(
    stack,
    testId+'redshift-from-pipeline-sinkS3Bucket',
    'doc-example-bucket',
  );

  const loadWorkflowS3Bucket = Bucket.fromBucketName(
    stack,
    testId+'redshift-from-pipeline-loadWorkflowBucket',
    'doc-example-bucket',
  );

  beforeEach(() => {
  });

  test('Check parameters for serverless nested stack - has all parameters', () => {
    const nestStack = findResourceByCondition(
      template,
      'redshiftServerless',
    );
    expect(nestStack).toBeDefined();

    const exceptedParams = [
      'RedshiftServerlessWorkgroupId',
      'RedshiftServerlessIAMRole',
      'ProjectId',
      'AppIds',
      'RedshiftServerlessWorkgroupName',
      'VpcId',
      'ODSEventFileSuffix',
      'PrivateSubnetIds',
      'ODSEventBucket',
      'ODSEventPrefix',
      'LoadWorkflowBucket',
      'LoadWorkflowBucketPrefix',
      'RedshiftServerlessNamespaceId',
      'MaxFilesLimit',
      'ProcessingFilesLimit',
      'LoadJobScheduleInterval',
    ];
    const templateParams = Object.keys(nestStack.Properties.Parameters).map(
      (pk) => {
        if (nestStack.Properties.Parameters[pk].Ref) {
          return nestStack.Properties.Parameters[pk].Ref;
        }
      },
    );

    // logger.info(`templateParams: ${JSON.stringify(templateParams)}`);
    for (const ep of exceptedParams) {
      // logger.info(`ep: ${ep}, ${templateParams.includes(ep)}`);
      expect(templateParams.includes(ep)).toBeTruthy();
    }
    expect(templateParams.length).toEqual(exceptedParams.length);
  });

  test('RedshiftServerlessWorkgroupName allowedPattern', () => {
    const param = template.toJSON().Parameters.RedshiftServerlessWorkgroupName;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      '192-169-1-1',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      '192_169_1_1',
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RedshiftServerlessWorkgroupId allowedPattern', () => {
    const param = template.toJSON().Parameters.RedshiftServerlessWorkgroupId;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      '',
      'a192-169-1-10000000000000000000000000000000',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      '192_169_1_1',
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('RedshiftServerlessIAMRole allowedPattern', () => {
    const param = template.toJSON().Parameters.RedshiftServerlessIAMRole;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'arn:aws:iam::000000000000:role/redshift-serverless-role',
      'arn:aws-cn:iam::000000000000:role/redshift-serverless-role',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'arn:aws:iam::xxxxxxxxxxxx:role/redshift-serverless-role',
      'arn:aws:iam::1234:role/redshift-serverless-role',
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('Must specify either Serverless Redshift or Provisioned Redshift', () => {
    const nestStackProps = {
      vpc: vpc,
      subnetSelection: subnetSelection,
      projectId: 'project1',
      appIds: 'app1',
      odsSource: {
        s3Bucket: sinkS3Bucket,
        prefix: 'project1/',
        fileSuffix: '.snappy',
      },
      loadWorkflowData: {
        s3Bucket: loadWorkflowS3Bucket,
        prefix: 'project1/',
      },
      loadDataProps: {
        scheduleInterval: 5,
        maxFilesLimit: 50,
        processingFilesLimit: 100,
      },
      serverlessRedshiftProps: undefined,
      provisionedRedshiftProps: undefined,
    };
    var error = false;
    try {
      new RedshiftAnalyticsStack(stack, testId+'redshiftAnalytics'+count++, nestStackProps);
    } catch (e) {
      logger.error('ERROR:'+e);
      error = true;
    }
    expect(error).toBeTruthy();
  });

  test('RedshiftServerlessPolicyFor props.serverlessRedshiftProps.workgroupId', () => {
    const serverlessRedshiftProps = {
      namespaceId: 'namespace1',
      workgroupName: 'workgroup1',
      workgroupId: 'workgroupId-1',
      superUserIAMRoleArn: 'arn:aws:iam::xxxxxxxxxxxx:role/role1',
    };
    const nestStackProps = {
      vpc: vpc,
      subnetSelection: subnetSelection,
      projectId: 'project1',
      appIds: 'app1',
      odsSource: {
        s3Bucket: sinkS3Bucket,
        prefix: 'project1/',
        fileSuffix: '.snappy',
      },
      loadWorkflowData: {
        s3Bucket: loadWorkflowS3Bucket,
        prefix: 'project1/',
      },
      loadDataProps: {
        scheduleInterval: 5,
        maxFilesLimit: 50,
        processingFilesLimit: 100,
      },
      serverlessRedshiftProps: serverlessRedshiftProps,
    };

    const nestedStack = new RedshiftAnalyticsStack(stack, testId+'redshiftAnalytics'+count++, nestStackProps);
    expect(nestedStack).toBeInstanceOf(RedshiftAnalyticsStack);
  });

});

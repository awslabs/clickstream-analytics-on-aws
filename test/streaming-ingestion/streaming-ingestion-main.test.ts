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

import { Logger } from '@aws-lambda-powertools/logger';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { REDSHIFT_MODE } from '../../src/common/model';
import { StreamingIngestionRedshiftStack, StreamingIngestionRedshiftStackProps } from '../../src/streaming-ingestion/streaming-ingestion-redshift-stack';
import { StreamingIngestionMainStack } from '../../src/streaming-ingestion-stack';
import { CFN_FN } from '../constants';
import { findConditionByName, findResourceByCondition } from '../utils';

const logger = new Logger();

describe('StreamingIngestionMainStack common parameter test', () => {
  const app = new App();
  const testId = 'test-1';
  const stack = new StreamingIngestionMainStack(app, testId+'-StreamingIngestionMainStack', {});
  const template = Template.fromStack(stack);
  let count = 0;

  beforeEach(() => {
  });

  test('Should has Parameter KinesisStreamMode', () => {
    template.hasParameter('KinesisStreamMode', {
      Type: 'String',
    });
  });

  test('Should has Parameter KinesisShardCount', () => {
    template.hasParameter('KinesisShardCount', {
      Type: 'Number',
    });
  });

  test('Should has Parameter KinesisDataRetentionHours', () => {
    template.hasParameter('KinesisDataRetentionHours', {
      Type: 'Number',
    });
  });

  test('Should has Parameter KinesisSourceStream', () => {
    template.hasParameter('KinesisSourceStream', {
      Type: 'String',
    });
  });

  test('Should has Parameter Parallelism', () => {
    template.hasParameter('Parallelism', {
      Type: 'Number',
    });
  });

  test('Should has Parameter ParallelismPerKPU', () => {
    template.hasParameter('ParallelismPerKPU', {
      Type: 'Number',
    });
  });

  test('Should has Parameter ApplicationCodeBucketARN', () => {
    template.hasParameter('ApplicationCodeBucketARN', {
      Type: 'String',
    });
  });

  test('Should has Parameter ApplicationCodeBucketPrefix', () => {
    template.hasParameter('ApplicationCodeBucketPrefix', {
      Type: 'String',
    });
  });

  test('Should has Parameter FlinkSecurityGroup', () => {
    template.hasParameter('FlinkSecurityGroup', {
      Type: 'String',
    });
  });

  test('Should has Parameter FlinkSubnets', () => {
    template.hasParameter('FlinkSubnets', {
      Type: 'String',
    });
  });

  test('Should has Parameter RedshiftMode', () => {
    template.hasParameter('RedshiftMode', {
      Type: 'String',
    });
  });

  test('RedshiftMode allowedValues', () => {
    const param = template.toJSON().Parameters.RedshiftMode;
    const allowedValues = param.AllowedValues;
    expect(allowedValues.length).toEqual(3);
    for (const v of allowedValues) {
      expect(v == REDSHIFT_MODE.SERVERLESS || v == REDSHIFT_MODE.PROVISIONED
        || v == REDSHIFT_MODE.NEW_SERVERLESS).toBeTruthy();
    };
  });

  test('Should has Parameter RedshiftDefaultDatabase', () => {
    template.hasParameter('RedshiftDefaultDatabase', {
      Type: 'String',
    });
  });

  test('ProjectId pattern', () => {
    const param = template.toJSON().Parameters.ProjectId;
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'a192_169_1_1',
      'proj',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
      '192_169_1_1',
      'Proj',
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
      'a192_169_1_1',
      'AppId',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'b1.test.com:abc',
      'b-1.test.com:9092,b-2.test.com:9092',
      'b1.test.com:9092',
      'b_1.test.com',
      '192-169-1-1',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('Conditions for nested stacks are created as expected', () => {
    const condition1 = findConditionByName(template, 'kinesisOnDemandRedshiftServerlessStackCondition');
    logger.info(condition1);
    expect(condition1[CFN_FN.AND][0][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'KinesisStreamMode',
    });
    expect(condition1[CFN_FN.AND][0][CFN_FN.EQUALS][1]).toEqual('ON_DEMAND');

    expect(condition1[CFN_FN.AND][1][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition1[CFN_FN.AND][1][CFN_FN.EQUALS][1]).toEqual('Serverless');

    const condition2 = findConditionByName(template, 'kinesisProvisionedRedshiftServerlessStackCondition');
    expect(condition2[CFN_FN.AND][0][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'KinesisStreamMode',
    });
    expect(condition2[CFN_FN.AND][0][CFN_FN.EQUALS][1]).toEqual('PROVISIONED');

    expect(condition2[CFN_FN.AND][1][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition2[CFN_FN.AND][1][CFN_FN.EQUALS][1]).toEqual('Serverless');

    const condition3 = findConditionByName(template, 'kinesisOnDemandRedshiftProvisionedStackCondition');
    expect(condition3[CFN_FN.AND][0][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'KinesisStreamMode',
    });
    expect(condition3[CFN_FN.AND][0][CFN_FN.EQUALS][1]).toEqual('ON_DEMAND');

    expect(condition3[CFN_FN.AND][1][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition3[CFN_FN.AND][1][CFN_FN.EQUALS][1]).toEqual('Provisioned');

    const condition4 = findConditionByName(template, 'kinesisProvisionedRedshiftProvisionedStackCondition');
    expect(condition4[CFN_FN.AND][0][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'KinesisStreamMode',
    });
    expect(condition4[CFN_FN.AND][0][CFN_FN.EQUALS][1]).toEqual('PROVISIONED');

    expect(condition4[CFN_FN.AND][1][CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition4[CFN_FN.AND][1][CFN_FN.EQUALS][1]).toEqual('Provisioned');

  });

  test('Should has Parameter RedshiftServerlessWorkgroupName', () => {
    template.hasParameter('RedshiftServerlessWorkgroupName', {
      Type: 'String',
    });
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

  test('Should has Parameter RedshiftServerlessNamespaceId', () => {
    template.hasParameter('RedshiftServerlessNamespaceId', {
      Type: 'String',
    });
  });

  test('Should has Parameter RedshiftIAMRole', () => {
    template.hasParameter('RedshiftIAMRole', {
      Type: 'String',
    });
  });

  test('RedshiftIAMRole allowedPattern', () => {
    const param = template.toJSON().Parameters.RedshiftIAMRole;
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

  test('Should has Parameter RedshiftClusterIdentifier', () => {
    template.hasParameter('RedshiftClusterIdentifier', {
      Type: 'String',
    });
  });

  test('Should has Parameter RedshiftDbUser', () => {
    template.hasParameter('RedshiftDbUser', {
      Type: 'String',
    });
  });


  test('Should has Rules for existing RedshiftServerless', () => {
    const rule = template.toJSON().Rules.ExistingRedshiftServerlessParameters;
    logger.info(`ExistingRedshiftServerlessParameters:${JSON.stringify(rule.Assertions[0].Assert[CFN_FN.AND])}`);
    for (const e of rule.Assertions[0].Assert[CFN_FN.AND]) {
      expect(e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftServerlessWorkgroupName' ||
          e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftIAMRole').toBeTruthy();
    }
  });

  test('Only specify one of existing Serverless and Provisioned Redshift - all undefined', () => {
    const nestStackProps: StreamingIngestionRedshiftStackProps = {
      projectId: 'project1',
      appIds: 'app1',
      stackShortId: 'stackShortId1',
      existingRedshiftServerlessProps: undefined,
      existingProvisionedRedshiftProps: undefined,
      dataAPIRoleArn: '',
      streamingIngestionProps: {
        streamingIngestionRoleArn: '',
      },
      associateRoleTimeout: 120,
    };

    let error = false;
    try {
      new StreamingIngestionRedshiftStack(stack, testId+'StreamingIngestionRedshiftStack'+count++, nestStackProps);
    } catch (e) {
      logger.error('ERROR:'+e);
      error = true;
    }
    expect(error).toBeTruthy();
  });

  test('Only specify one of existing Serverless and Provisioned Redshift - all defined', () => {
    const serverlessRedshiftProps = {
      databaseName: 'dev',
      namespaceId: 'namespace1',
      workgroupName: 'workgroup1',
      dataAPIRoleArn: 'arn:aws:iam::xxxxxxxxxxxx:role/role1',
      createdInStack: false,
    };
    const provisionedRedshiftProps = {
      databaseName: 'dev',
      clusterIdentifier: 'clusterIdentifier1',
      dbUser: 'dbUser1',
    };
    const nestStackProps: StreamingIngestionRedshiftStackProps = {
      projectId: 'project1',
      appIds: 'app1',
      existingRedshiftServerlessProps: serverlessRedshiftProps,
      existingProvisionedRedshiftProps: provisionedRedshiftProps,
      dataAPIRoleArn: 'arn:aws:iam::xxxxxxxxxxxx:role/data-api-role1',
      streamingIngestionProps: {
        streamingIngestionRoleArn: 'arn:aws:iam::xxxxxxxxxxxx:role/streaming-ingestion-role1',
      },
      stackShortId: '',
      associateRoleTimeout: 120,
    };
    let error = false;
    try {
      new StreamingIngestionRedshiftStack(stack, testId+'StreamingIngestionRedshiftStack'+count++, nestStackProps);
    } catch (e) {
      logger.error('ERROR:'+e);
      error = true;
    }
    expect(error).toBeTruthy();
  });
});

describe('StreamingIngestionMainStack kinesis and redshift condition test', () => {
  const app = new App();
  const testId = 'test-2';
  const stack = new StreamingIngestionMainStack(app, testId+'-StreamingIngestionMainStack', {});
  const template = Template.fromStack(stack);

  beforeEach(() => {
  });

  test('Check parameters for kinesisOnDemandRedshiftServerlessStackCondition nested stack - has all parameters', () => {
    const nestStack = findResourceByCondition(
      template,
      'kinesisOnDemandRedshiftServerlessStackCondition',
    );
    expect(nestStack).toBeDefined();

    const exceptedParams = [
      'AWS::StackId',
      'ApplicationCodeBucketARN',
      'ApplicationCodeBucketPrefix',
      'ProjectId',
      'AppIds',
      'KinesisDataRetentionHours',
      'KinesisSourceStream',
      'Parallelism',
      'ParallelismPerKPU',
      'FlinkSecurityGroup',
      'FlinkSubnets',
    ];

    const templateParams = Object.keys(nestStack.Properties.Parameters).map(
      (pk) => {
        if (nestStack.Properties.Parameters[pk].Ref) {
          return nestStack.Properties.Parameters[pk].Ref;
        }
      },
    );

    logger.info(`templateParams: ${JSON.stringify(templateParams)}`);
    for (const ep of exceptedParams) {
      logger.info(`ep: ${ep}, ${templateParams.includes(ep)}`);
      expect(templateParams.includes(ep)).toBeTruthy();
    }
    expect(templateParams.length).toEqual(exceptedParams.length);
  });

  test('Check parameters for kinesisProvisionedRedshiftServerlessStackCondition nested stack - has all parameters', () => {
    const nestStack = findResourceByCondition(
      template,
      'kinesisProvisionedRedshiftServerlessStackCondition',
    );
    expect(nestStack).toBeDefined();

    const exceptedParams = [
      'AWS::StackId',
      'ApplicationCodeBucketARN',
      'ApplicationCodeBucketPrefix',
      'ProjectId',
      'AppIds',
      'KinesisDataRetentionHours',
      'KinesisShardCount',
      'KinesisSourceStream',
      'Parallelism',
      'ParallelismPerKPU',
      'FlinkSecurityGroup',
      'FlinkSubnets',
    ];

    const templateParams = Object.keys(nestStack.Properties.Parameters).map(
      (pk) => {
        if (nestStack.Properties.Parameters[pk].Ref) {
          return nestStack.Properties.Parameters[pk].Ref;
        }
      },
    );

    logger.info(`templateParams: ${JSON.stringify(templateParams)}`);
    for (const ep of exceptedParams) {
      logger.info(`ep: ${ep}, ${templateParams.includes(ep)}`);
      expect(templateParams.includes(ep)).toBeTruthy();
    }
    expect(templateParams.length).toEqual(exceptedParams.length);
  });

  test('Check parameters for kinesisOnDemandRedshiftProvisionedStackCondition nested stack - has all parameters', () => {
    const nestStack = findResourceByCondition(
      template,
      'kinesisOnDemandRedshiftProvisionedStackCondition',
    );
    expect(nestStack).toBeDefined();

    const exceptedParams = [
      'AWS::StackId',
      'ApplicationCodeBucketARN',
      'ApplicationCodeBucketPrefix',
      'ProjectId',
      'AppIds',
      'KinesisDataRetentionHours',
      'KinesisSourceStream',
      'Parallelism',
      'ParallelismPerKPU',
      'FlinkSecurityGroup',
      'FlinkSubnets',
    ];

    const templateParams = Object.keys(nestStack.Properties.Parameters).map(
      (pk) => {
        if (nestStack.Properties.Parameters[pk].Ref) {
          return nestStack.Properties.Parameters[pk].Ref;
        }
      },
    );

    logger.info(`templateParams: ${JSON.stringify(templateParams)}`);
    for (const ep of exceptedParams) {
      logger.info(`ep: ${ep}, ${templateParams.includes(ep)}`);
      expect(templateParams.includes(ep)).toBeTruthy();
    }
    expect(templateParams.length).toEqual(exceptedParams.length);
  });

  test('Check parameters for kinesisProvisionedRedshiftProvisionedStackCondition nested stack - has all parameters', () => {
    const nestStack = findResourceByCondition(
      template,
      'kinesisProvisionedRedshiftProvisionedStackCondition',
    );
    expect(nestStack).toBeDefined();

    const exceptedParams = [
      'AWS::StackId',
      'ApplicationCodeBucketARN',
      'ApplicationCodeBucketPrefix',
      'ProjectId',
      'AppIds',
      'KinesisDataRetentionHours',
      'KinesisShardCount',
      'KinesisSourceStream',
      'Parallelism',
      'ParallelismPerKPU',
      'FlinkSecurityGroup',
      'FlinkSubnets',
    ];

    const templateParams = Object.keys(nestStack.Properties.Parameters).map(
      (pk) => {
        if (nestStack.Properties.Parameters[pk].Ref) {
          return nestStack.Properties.Parameters[pk].Ref;
        }
      },
    );

    logger.info(`templateParams: ${JSON.stringify(templateParams)}`);
    for (const ep of exceptedParams) {
      logger.info(`ep: ${ep}, ${templateParams.includes(ep)}`);
      expect(templateParams.includes(ep)).toBeTruthy();
    }
    expect(templateParams.length).toEqual(exceptedParams.length);
  });
});
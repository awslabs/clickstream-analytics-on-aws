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
  OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX, OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_NAMESPACE_NAME,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME, OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_PORT,
  OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_ADDRESS,
  OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX, OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX,
  OUTPUT_DATA_MODELING_REDSHIFT_SQL_EXECUTION_STATE_MACHINE_ARN_SUFFIX,
} from '@aws/clickstream-base-lib';
import {
  Logger,
} from '@aws-lambda-powertools/logger';
import { App, Fn } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RedshiftAnalyticsStack, RedshiftAnalyticsStackProps } from '../../../src/analytics/analytics-on-redshift';
import { REDSHIFT_MODE, BuiltInTagKeys, MetricsNamespace } from '../../../src/common/model';
import { SolutionInfo } from '../../../src/common/solution-info';
import { getExistVpc } from '../../../src/common/vpc-utils';
import { DataAnalyticsRedshiftStack } from '../../../src/data-analytics-redshift-stack';
import { WIDGETS_ORDER } from '../../../src/metrics/settings';
import { CFN_FN } from '../../constants';
import { validateSubnetsRule } from '../../rules';
import { getParameter, findFirstResourceByKeyPrefix, RefAnyValue, findResourceByCondition, findConditionByName, JoinAnyValue, RefGetAtt } from '../../utils';

const logger = new Logger();

describe('DataAnalyticsRedshiftStack common parameter test', () => {
  const app = new App();
  const testId = 'test-1';
  const stack = new DataAnalyticsRedshiftStack(app, testId + '-data-analytics-redshift-stack-serverless', {});
  const template = Template.fromStack(stack);

  beforeEach(() => {
  });

  test('Should has Parameter VpcId', () => {
    template.hasParameter('VpcId', {
      Type: 'AWS::EC2::VPC::Id',
    });
  });

  test('Should has Parameter PrivateSubnetIds', () => {
    template.hasParameter('PrivateSubnetIds', {
      Type: 'String',
    });
  });

  test('Should check PrivateSubnetIds pattern', () => {
    const param = getParameter(template, 'PrivateSubnetIds');
    const pattern = param.AllowedPattern;
    const regex = new RegExp(`${pattern}`);
    const validValues = [
      'subnet-a1234,subnet-b1234',
      'subnet-fffff1,subnet-fffff2,subnet-fffff3',
    ];

    for (const v of validValues) {
      expect(v).toMatch(regex);
    }

    const invalidValues = [
      'subnet-a1234',
      'net-a1234,net-b1234',
      'subnet-g1234,subnet-g1234',
      'subnet-a1234, subnet-b1234',
    ];
    for (const v of invalidValues) {
      expect(v).not.toMatch(regex);
    }
  });

  test('Has Rule to validate subnets in VPC', () => {
    validateSubnetsRule(template);
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

  test('Should has parameter ODSEventBucket', () => {
    template.hasParameter('ODSEventBucket', {
      Type: 'String',
    });
  });

  test('Should has parameter ODSEventPrefix', () => {
    template.hasParameter('ODSEventPrefix', {
      Type: 'String',
    });
  });

  test('Should has parameter ODSEventFileSuffix', () => {
    template.hasParameter('ODSEventFileSuffix', {
      Type: 'String',
    });
  });


  test('Should has parameter EMRServerlessApplicationId', () => {
    template.hasParameter('EMRServerlessApplicationId', {
      Type: 'String',
      Default: '',
    });
  });

  test('Should has parameter DataProcessingCronOrRateExpression', () => {
    template.hasParameter('DataProcessingCronOrRateExpression', {
      Type: 'String',
    });
  });

  test('Should has parameter LoadWorkflowBucket', () => {
    template.hasParameter('LoadWorkflowBucket', {
      Type: 'String',
    });
  });

  test('Should has parameter LoadWorkflowBucketPrefix', () => {
    template.hasParameter('LoadWorkflowBucketPrefix', {
      Type: 'String',
    });
  });

  test('Should check S3 bucket pattern', () => {
    [getParameter(template, 'ODSEventBucket'),
      getParameter(template, 'LoadWorkflowBucket')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'abc',
        'abc-test',
        'abc.test',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        'ab',
        'ab_test',
        '',
        'ABC',
        'tooooooooooooooooooooooooooooooooooooooooloooooooooooooooooooong',
      ];
      for (const v of invalidValues) {
        expect(v).not.toMatch(regex);
      }
    });
  });

  test('Check S3Prefix pattern', () => {
    [getParameter(template, 'ODSEventPrefix'),
      getParameter(template, 'LoadWorkflowBucketPrefix')].forEach(param => {
      const pattern = param.AllowedPattern;
      const regex = new RegExp(`${pattern}`);
      const validValues = [
        'abc/',
        'abc/test/',
        'ABC/test/',
      ];

      for (const v of validValues) {
        expect(v).toMatch(regex);
      }

      const invalidValues = [
        '/ab',
        'ab_test',
        'ab/test',
      ];
      for (const v of invalidValues) {
        expect(v).not.toMatch(regex);
      }
    });
  });

  test('Should has Rules S3BucketReadinessRule', () => {
    const rule = template.toJSON().Rules.S3BucketReadinessRule;
    expect(rule.Assertions[0].Assert[CFN_FN.AND].length).toEqual(6);
    const paramList = ['ODSEventBucket', 'ODSEventPrefix', 'LoadWorkflowBucket', 'LoadWorkflowBucketPrefix', 'PipelineS3Bucket', 'PipelineS3Prefix'];
    let paramCount = 0;
    for (const element of rule.Assertions[0].Assert[CFN_FN.AND]) {
      paramList.forEach(p => {
        if (p === element[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref) {
          paramCount++;
        }
      });
    }
    expect(paramCount).toEqual(paramList.length);
  });

  test('Should has Resource Custom::S3BucketNotifications to enable ODS bucket with EventBridge integration', () => {
    template.hasResourceProperties('Custom::S3BucketNotifications', {
      ServiceToken: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      BucketName: {
        Ref: 'ODSEventBucket',
      },
      NotificationConfiguration: {
        EventBridgeConfiguration: {},
      },
      Managed: false,
    });

    const bucketNotificationsHandler = findFirstResourceByKeyPrefix(template, 'AWS::IAM::Role', 'BucketNotificationsHandler');
    expect(bucketNotificationsHandler.resource.Properties.AssumeRolePolicyDocument.Statement[0].Action).toEqual('sts:AssumeRole');
  });

  test('Should has Parameter RedshiftMode', () => {
    template.hasParameter('RedshiftMode', {
      Type: 'String',
    });
  });

  test('Should has Parameter MVRefreshInterval', () => {
    template.hasParameter('MVRefreshInterval', {
      Type: 'Number',
      MinValue: 6,
      MaxValue: 1440,
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

  test('Should has parameter LoadJobScheduleInterval', () => {
    template.hasParameter('LoadJobScheduleInterval', {
      Type: 'String',
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

  test('Security group count is 1', () => {
    const templates = [
      Template.fromStack(stack.nestedStacks.redshiftServerlessStack),
      Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack),
      Template.fromStack(stack.nestedStacks.redshiftProvisionedStack),
    ];
    for (const nestedTemplate of templates) {
      nestedTemplate.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    }
  });

  test('Should has Resource CreateApplicationSchemasRedshiftSQLExecutionRole', () => {
    const nestedTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
    const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'CreateApplicationSchemasRedshiftSQLExecutionRole');
    expect(role.resource.Properties.AssumeRolePolicyDocument.Statement[0].Action).toEqual('sts:AssumeRole');
    let hasDataExecRole = false;
    const rolePolicy = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Policy', 'CreateApplicationSchemasRedshiftSQLExecutionRoleDefaultPolicy');
    for (const s of rolePolicy.resource.Properties.PolicyDocument.Statement) {
      if (s.Action === 'sts:AssumeRole' && s.Resource.Ref) {
        expect(s.Resource.Ref).toContain('RedshiftServerlessIAMRole');
        hasDataExecRole = true;
      }
    }
    expect(hasDataExecRole).toBeTruthy();
  });

  test('Should has ParameterGroups and ParameterLabels', () => {
    const cfnInterface =
      template.toJSON().Metadata['AWS::CloudFormation::Interface'];
    expect(cfnInterface.ParameterGroups).toBeDefined();

    const paramCount = Object.keys(cfnInterface.ParameterLabels).length;
    expect(paramCount).toEqual(35);
  });

  test('Conditions for nested redshift stacks are created as expected', () => {

    const condition1 = findConditionByName(template, 'newRedshiftServerless');
    expect(condition1[CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition1[CFN_FN.EQUALS][1]).toEqual('New_Serverless');

    const condition2 = findConditionByName(template, 'existingRedshiftServerless');
    expect(condition2[CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition2[CFN_FN.EQUALS][1]).toEqual('Serverless');

    const condition3 = findConditionByName(template, 'redshiftProvisioned');
    expect(condition3[CFN_FN.EQUALS][0]).toEqual({
      Ref: 'RedshiftMode',
    });
    expect(condition3[CFN_FN.EQUALS][1]).toEqual('Provisioned');

  });

  test('Should has Parameter AppRegistryApplicationArn', () => {
    template.hasParameter('AppRegistryApplicationArn', {
      Type: 'String',
    });
  });
});

describe('DataAnalyticsRedshiftStack serverless parameter test', () => {
  const app = new App();
  const testId = 'test-2';
  const stack = new DataAnalyticsRedshiftStack(app, testId + '-data-analytics-redshift-stack-serverless', {});
  const template = Template.fromStack(stack);
  let count = 1;

  // Vpc
  const vpc = getExistVpc(stack, testId + '-from-vpc-for-redshift', {
    vpcId: 'vpc-1',
    availabilityZones: Fn.getAzs(),
    privateSubnetIds: Fn.split(',', 'subnet-1,subnet-2,subnet-3'),
  });

  const subnetSelection: SubnetSelection = {
    subnets: vpc.privateSubnets,
  };

  const sinkS3Bucket = Bucket.fromBucketName(
    stack,
    testId + 'redshift-from-pipeline-sinkS3Bucket',
    'doc-example-bucket',
  );

  const loadWorkflowS3Bucket = Bucket.fromBucketName(
    stack,
    testId + 'redshift-from-pipeline-loadWorkflowBucket',
    'doc-example-bucket',
  );

  beforeEach(() => {
  });


  const nestStackCommonTablesProps = {
    tablesOdsSource: {
      event: {
        s3Bucket: sinkS3Bucket,
        prefix: 'project1/event/',
        fileSuffix: '.snappy',
      },
      event_parameter: {
        s3Bucket: sinkS3Bucket,
        prefix: 'project1/event_parameter/',
        fileSuffix: '.snappy',
      },
      user: {
        s3Bucket: sinkS3Bucket,
        prefix: 'project1/user/',
        fileSuffix: '.snappy',
      },
      item: {
        s3Bucket: sinkS3Bucket,
        prefix: 'project1/item/',
        fileSuffix: '.snappy',
      },
    },
    workflowBucketInfo: {
      s3Bucket: loadWorkflowS3Bucket,
      prefix: 'project1/',
    },
    loadDataConfig: {
      maxFilesLimit: 50,
    },
  };

  test('Check parameters for existing serverless nested stack - has all parameters', () => {
    const nestStack = findResourceByCondition(
      template,
      'existingRedshiftServerless',
    );
    expect(nestStack).toBeDefined();

    const exceptedParams = [
      'RedshiftDefaultDatabase',
      'RedshiftServerlessWorkgroupId',
      'RedshiftServerlessIAMRole',
      'ProjectId',
      'AppIds',
      'RedshiftServerlessWorkgroupName',
      'VpcId',
      'IamRoleBoundaryArn',
      'ODSEventFileSuffix',
      'PrivateSubnetIds',
      'ODSEventBucket',
      'LoadWorkflowBucket',
      'LoadWorkflowBucketPrefix',
      'RedshiftServerlessNamespaceId',
      'MaxFilesLimit',
      'ClickstreamAnalyticsMetadataDdbArn',
      'PipelineS3Bucket',
      'PipelineS3Prefix',
      'TopFrequentPropertiesLimit',
      'ScanWorkflowMinInterval',
      'ClearExpiredEventsScheduleExpression',
      'ClearExpiredEventsRetentionRangeDays',
      'EMRServerlessApplicationId',
      'DataProcessingCronOrRateExpression',
      'MVRefreshInterval',
    ];
    const templateParams = Object.keys(nestStack.Properties.Parameters).map(
      (pk) => {
        if (nestStack.Properties.Parameters[pk].Ref) {
          return nestStack.Properties.Parameters[pk].Ref;
        }
      },
    );

    logger.info('templateParams:', { templateParams });
    for (const ep of exceptedParams) {
      logger.info('input', {
        ep: ep,
        includesInTemplate: templateParams.includes(ep),
      });
      expect(templateParams.includes(ep)).toBeTruthy();
    }
    expect(templateParams.length).toEqual(exceptedParams.length + 1);
  });

  test('Check parameters for new serverless nested stack - has expected parameters for new redshift serverless', () => {
    const nestStack = findResourceByCondition(
      template,
      'newRedshiftServerless',
    );
    expect(nestStack).toBeDefined();

    const exceptedParams = [
      'NewRedshiftServerlessWorkgroupName',
      'RedshiftServerlessSubnets',
      'RedshiftServerlessSGs',
      'RedshiftServerlessRPU',
    ];
    const templateParams = Object.keys(nestStack.Properties.Parameters).map(
      (pk) => {
        if (nestStack.Properties.Parameters[pk].Ref) {
          return nestStack.Properties.Parameters[pk].Ref;
        }
      },
    );

    for (const ep of exceptedParams) {
      expect(templateParams.includes(ep)).toBeTruthy();
    }
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

  test('Should has Rules for existing RedshiftServerless', () => {
    const rule = template.toJSON().Rules.ExistingRedshiftServerlessParameters;
    logger.info('Params', { ExistingRedshiftServerlessParameters: rule.Assertions[0].Assert[CFN_FN.AND] });
    for (const e of rule.Assertions[0].Assert[CFN_FN.AND]) {
      expect(e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftServerlessWorkgroupName' ||
        e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftServerlessIAMRole').toBeTruthy();
    }
  });

  test('Should has Rules for new RedshiftServerless', () => {
    const rule = template.toJSON().Rules.NewRedshiftServerlessParameters;
    expect(rule.RuleCondition[CFN_FN.EQUALS][1]).toEqual(REDSHIFT_MODE.NEW_SERVERLESS);
    for (const e of rule.Assertions[0].Assert[CFN_FN.AND]) {
      expect(e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'NewRedshiftServerlessWorkgroupName' ||
        e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftServerlessVPCId' ||
        e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftServerlessSubnets' ||
        e[CFN_FN.NOT][0][CFN_FN.EQUALS][0].Ref === 'RedshiftServerlessSGs').toBeTruthy();
    }
  });

  test('Only specify one of new Serverless Redshift, existing Serverless and Provisioned Redshift - all undefined', () => {
    const nestStackProps: RedshiftAnalyticsStackProps = {
      vpc: vpc,
      subnetSelection: subnetSelection,
      projectId: 'project1',
      appIds: 'app1',
      ...nestStackCommonTablesProps,
      mvRefreshInterval: 120,
      newRedshiftServerlessProps: undefined,
      existingRedshiftServerlessProps: undefined,
      provisionedRedshiftProps: undefined,
      scanMetadataWorkflowData: {
        clickstreamAnalyticsMetadataDdbArn: 'arn:aws:dynamodb:us-east-1:111122223333:table/ClickstreamAnalyticsMetadata',
        topFrequentPropertiesLimit: '20',
        scanWorkflowMinInterval: '1440',
        pipelineS3Bucket: 'pipeline-s3-bucket',
        pipelineS3Prefix: 'pipelineS3Prefix',
      },
      clearExpiredEventsWorkflowData: {
        scheduleExpression: 'cron(0 17 * * ? *)',
        retentionRangeDays: 365,
      },
      emrServerlessApplicationId: 'emrServerlessApplicationId001',
      dataProcessingCronOrRateExpression: 'cron(0 1 * * ? *)',
      dataSourceBucket: loadWorkflowS3Bucket,
      dataSourcePrefix: 'project1/',
    };
    let error = false;
    try {
      new RedshiftAnalyticsStack(stack, testId + 'redshiftAnalytics' + count++, nestStackProps);
    } catch (e) {
      logger.error('ERROR:' + e);
      error = true;
    }
    expect(error).toBeTruthy();
  });

  test('Only specify one of new Serverless Redshift, existing Serverless and Provisioned Redshift - all defined', () => {
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
    const nestStackProps: RedshiftAnalyticsStackProps = {
      vpc: vpc,
      subnetSelection: subnetSelection,
      projectId: 'project1',
      appIds: 'app1',
      ...nestStackCommonTablesProps,
      mvRefreshInterval: 120,
      newRedshiftServerlessProps: {
        vpcId: 'vpc-id',
        subnetIds: 'subnet-1,subnet-2',
        securityGroupIds: 'sg-1,sg-2',
        workgroupName: 'default',
        baseCapacity: 8,
        databaseName: 'dev',
      },
      existingRedshiftServerlessProps: serverlessRedshiftProps,
      provisionedRedshiftProps: provisionedRedshiftProps,
      scanMetadataWorkflowData: {
        clickstreamAnalyticsMetadataDdbArn: 'arn:aws:dynamodb:us-east-1:111122223333:table/ClickstreamAnalyticsMetadata',
        topFrequentPropertiesLimit: '20',
        scanWorkflowMinInterval: '1440',
        pipelineS3Bucket: 'pipeline-s3-bucket',
        pipelineS3Prefix: 'pipelineS3Prefix',
      },
      clearExpiredEventsWorkflowData: {
        scheduleExpression: 'cron(0 17 * * ? *)',
        retentionRangeDays: 365,
      },
      emrServerlessApplicationId: 'emrServerlessApplicationId001',
      dataProcessingCronOrRateExpression: 'cron(0 1 * * ? *)',
      dataSourceBucket: loadWorkflowS3Bucket,
      dataSourcePrefix: 'project1/',
    };
    let error = false;
    try {
      new RedshiftAnalyticsStack(stack, testId + 'redshiftAnalytics' + count++, nestStackProps);
    } catch (e) {
      logger.error('ERROR:' + e);
      error = true;
    }
    expect(error).toBeTruthy();
  });

  test('RedshiftServerlessPolicyFor props.serverlessRedshiftProps.workgroupId', () => {
    const serverlessRedshiftProps = {
      databaseName: 'dev',
      namespaceId: 'namespace1',
      workgroupName: 'workgroup1',
      workgroupId: 'workgroupId-1',
      dataAPIRoleArn: 'arn:aws:iam::xxxxxxxxxxxx:role/role1',
      createdInStack: false,
    };
    const nestStackProps: RedshiftAnalyticsStackProps = {
      vpc: vpc,
      subnetSelection: subnetSelection,
      projectId: 'project1',
      appIds: 'app1',
      ...nestStackCommonTablesProps,
      mvRefreshInterval: 120,
      existingRedshiftServerlessProps: serverlessRedshiftProps,
      scanMetadataWorkflowData: {
        clickstreamAnalyticsMetadataDdbArn: 'arn:aws:dynamodb:us-east-1:111122223333:table/ClickstreamAnalyticsMetadata',
        topFrequentPropertiesLimit: '20',
        scanWorkflowMinInterval: '1440',
        pipelineS3Bucket: 'pipeline-s3-bucket',
        pipelineS3Prefix: 'pipelineS3Prefix',
      },
      clearExpiredEventsWorkflowData: {
        scheduleExpression: 'cron(0 17 * * ? *)',
        retentionRangeDays: 365,
      },
      emrServerlessApplicationId: 'emrServerlessApplicationId001',
      dataProcessingCronOrRateExpression: 'cron(0 1 * * ? *)',
      dataSourceBucket: loadWorkflowS3Bucket,
      dataSourcePrefix: 'project1/',
    };

    const nestedStack = new RedshiftAnalyticsStack(stack, testId + 'redshiftAnalytics' + count++, nestStackProps);
    expect(nestedStack).toBeInstanceOf(RedshiftAnalyticsStack);
  });

  test('Should has 5 StateMachines', () => {
    const templates = [
      Template.fromStack(stack.nestedStacks.redshiftServerlessStack),
      Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack),
      Template.fromStack(stack.nestedStacks.redshiftProvisionedStack),
    ];
    for (const nestedTemplate of templates) {
      nestedTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 5);
    }
  });

  test('Should has Resource RedshiftServerlessAllWorkgroupPolicy', () => {
    const nestedTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
    nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'redshift-serverless:GetWorkgroup',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  RefAnyValue,
                  ':redshift-serverless:',
                  RefAnyValue,
                  ':',
                  RefAnyValue,
                  ':workgroup/*',
                ],
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: Match.anyValue(),
      Roles: [
        RefAnyValue,
      ],
    });
  });

});

describe('DataAnalyticsRedshiftStack lambda function test', () => {
  const app = new App();
  const testId = 'test-3';
  const stack = new DataAnalyticsRedshiftStack(app, testId + '-data-analytics-redshift-stack-serverless', {});
  const newServerlessTemplate = Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack);
  const existingServerlessTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
  const provisionedTemplate = Template.fromStack(stack.nestedStacks.redshiftProvisionedStack);
  const serverlessTemplates = [
    existingServerlessTemplate,
    newServerlessTemplate,
  ];
  const allNestedTemplates = [
    ...serverlessTemplates,
    provisionedTemplate,
  ];

  beforeEach(() => {
  });

  test('Should has Dynamodb table', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.resourceCountIs('AWS::DynamoDB::Table', 1);
    }
  });

  test('Should states:ListExecutions Policy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'states:ListExecutions',
              Effect: 'Allow',
              Resource: {
                Ref: Match.anyValue(),
              },
            },
          ],
          Version: '2012-10-17',
        },
        Roles: [
          {
            Ref: Match.anyValue(),
          },
        ],
      });
    }
  });

  test('Should has LoadDataCreateLoadManifestRoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const policy = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Policy', 'LoadDataCreateLoadManifestRoleDefaultPolicy');
      const statement = policy.resource.Properties.PolicyDocument.Statement;
      let containDynamodbAction = false;
      for (const s of statement) {
        for (const a of s.Action) {
          if (a.startsWith('dynamodb')) {
            containDynamodbAction = true;
            break;
          }
        }
      }
      expect(containDynamodbAction).toBeTruthy();
    }
  });


  test('Check lambda HasMoreWorkFn', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Code: {
          S3Bucket: {
            'Fn::Sub': Match.anyValue(),
          },
          S3Key: Match.anyValue(),
        },
        Role: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        Environment: {
          Variables: {
            POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
            POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
            POWERTOOLS_LOGGER_LOG_EVENT: 'true',
            LOG_LEVEL: 'WARN',
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
            PROJECT_ID: Match.anyValue(),
            DYNAMODB_TABLE_NAME: Match.anyValue(),
            DYNAMODB_TABLE_INDEX_NAME: Match.anyValue(),
          },
        },
        Handler: 'index.handler',
        MemorySize: 1024,
        ReservedConcurrentExecutions: 1,
        Runtime: Match.anyValue(),
        Timeout: 120,
        LoggingConfig: {
          ApplicationLogLevel: 'WARN',
          LogFormat: 'JSON',
        },
      });
    }
  });


  test('Check LoadODSEventToRedshiftWorkflowODSEventProcessorFn', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Code: {
          S3Bucket: {
            'Fn::Sub': Match.anyValue(),
          },
          S3Key: Match.anyValue(),
        },
        Role: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        Environment: {
          Variables: {
            PROJECT_ID: RefAnyValue,
            S3_FILE_SUFFIX: RefAnyValue,
            DYNAMODB_TABLE_NAME: RefAnyValue,
            POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
            POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
            POWERTOOLS_LOGGER_LOG_EVENT: 'true',
            LOG_LEVEL: 'WARN',
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
          },
        },
        Handler: 'index.handler',
        MemorySize: Match.anyValue(),
        ReservedConcurrentExecutions: 2,
        Runtime: Match.anyValue(),
        Timeout: 60,
        VpcConfig: {
          SecurityGroupIds: [
            {
              'Fn::GetAtt': [
                Match.anyValue(),
                'GroupId',
              ],
            },
          ],
          SubnetIds: {
            'Fn::Split': [
              ',',
              RefAnyValue,
            ],
          },
        },
      });
    }
  });

  test('Check rule LoadODSEventToRedshiftWorkflowODSEventHandler', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: {
          'detail-type': [
            {
              'equals-ignore-case': 'object created',
            },
          ],
          'detail': {
            bucket: {
              name: [
                RefAnyValue,
              ],
            },
            object: {
              key: [
                {
                  prefix: JoinAnyValue,
                },
              ],
            },
          },
          'source': [
            'aws.s3',
          ],
        },
        State: 'ENABLED',
        Targets: [
          {
            Arn: {
              'Fn::GetAtt': [
                Match.anyValue(),
                'Arn',
              ],
            },
            Id: Match.anyValue(),
          },
        ],
      });
    }
  });

  test('Check CopyDataFromS3RoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                      '/',
                      RefAnyValue,
                      'event/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                      '/',
                      RefAnyValue,
                      '*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                      '/',
                      RefAnyValue,
                      'event_parameter/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                      '/',
                      RefAnyValue,
                      'user/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                      '/',
                      RefAnyValue,
                      'item/*',
                    ],
                  ],
                },
              ],
            },
          ],
          Version: '2012-10-17',
        },
        PolicyName: Match.anyValue(),
        Roles: [
          RefAnyValue,
        ],
      });
    }
  });

  test('Check LoadODSEventToRedshiftWorkflowRedshiftServerlessAllWorkgroupPolicy', () => {
    existingServerlessTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'redshift-serverless:GetWorkgroup',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  RefAnyValue,
                  ':redshift-serverless:',
                  RefAnyValue,
                  ':',
                  RefAnyValue,
                  ':workgroup/*',
                ],
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: Match.anyValue(),
      Roles: [
        RefAnyValue,
      ],
    });
  });

  test('Check LoadODSEventToRedshiftWorkflowRedshiftServerlessAllNamespacePolicy', () => {
    existingServerlessTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'redshift-serverless:GetNamespace',
              'redshift-serverless:UpdateNamespace',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  RefAnyValue,
                  ':redshift-serverless:',
                  RefAnyValue,
                  ':',
                  RefAnyValue,
                  ':namespace/*',
                ],
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: Match.anyValue(),
      Roles: [
        RefAnyValue,
      ],
    });
  });

  test('Check LoadDataCreateLoadManifestEventRoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:AssignPrivateIpAddresses',
                'ec2:UnassignPrivateIpAddresses',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: 'cloudwatch:PutMetricData',
              Condition: {
                StringEquals: {
                  'cloudwatch:namespace': MetricsNamespace.REDSHIFT_ANALYTICS,
                },
              },
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'dynamodb:BatchGetItem',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:ConditionCheckItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::GetAtt': [
                    Match.anyValue(),
                    'Arn',
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      {
                        'Fn::GetAtt': [
                          Match.anyValue(),
                          'Arn',
                        ],
                      },

                      '/index/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: [
                's3:DeleteObject*',
                's3:PutObject',
                's3:PutObjectLegalHold',
                's3:PutObjectRetention',
                's3:PutObjectTagging',
                's3:PutObjectVersionTagging',
                's3:Abort*',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                    ],
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      RefAnyValue,
                      ':s3:::',
                      RefAnyValue,
                      '/',
                      RefAnyValue,
                      '*',
                    ],
                  ],
                },
              ],
            },
          ],
          Version: '2012-10-17',
        },
        PolicyName: Match.anyValue(),
        Roles: [
          RefAnyValue,
        ],
      });
    }
  });

  test('Check lambda LoadODSEventToRedshiftWorkflowCreateLoadManifestFn', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Code: {
          S3Bucket: {
            'Fn::Sub': Match.anyValue(),
          },
          S3Key: Match.anyValue(),
        },
        Role: {
          'Fn::GetAtt': [
            Match.anyValue(),
            'Arn',
          ],
        },
        Environment: {
          Variables: {
            PROJECT_ID: RefAnyValue,
            MANIFEST_BUCKET: RefAnyValue,
            MANIFEST_BUCKET_PREFIX: RefAnyValue,
            QUERY_RESULT_LIMIT: RefAnyValue,
            DYNAMODB_TABLE_NAME: RefAnyValue,
            DYNAMODB_TABLE_INDEX_NAME: 'status_timestamp_index',
            POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
            POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
            POWERTOOLS_LOGGER_LOG_EVENT: 'true',
            LOG_LEVEL: 'WARN',
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
          },
        },
        Handler: 'index.handler',
        MemorySize: 1024,
        ReservedConcurrentExecutions: 1,
        Runtime: Match.anyValue(),
        Timeout: 300,
        VpcConfig: {
          SecurityGroupIds: [
            {
              'Fn::GetAtt': [
                Match.anyValue(),
                'GroupId',
              ],
            },
          ],
          SubnetIds: {
            'Fn::Split': [
              ',',
              RefAnyValue,
            ],
          },
        },
      });
    }
  });

  test('Check LoadODSEventToRedshiftWorkflowLoadManifestToRedshiftRoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:AssignPrivateIpAddresses',
                'ec2:UnassignPrivateIpAddresses',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: 'cloudwatch:PutMetricData',
              Condition: {
                StringEquals: {
                  'cloudwatch:namespace': MetricsNamespace.REDSHIFT_ANALYTICS,
                },
              },
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'dynamodb:BatchGetItem',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:ConditionCheckItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::GetAtt': [
                    Match.anyValue(),
                    'Arn',
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      {
                        'Fn::GetAtt': [
                          Match.anyValue(),
                          'Arn',
                        ],
                      },
                      '/index/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
            },
          ],
          Version: '2012-10-17',
        },
        PolicyName: Match.anyValue(),
        Roles: [
          RefAnyValue,
        ],
      });
    }
  });

  test('Check LoadODSEventToRedshiftWorkflowLoadManifestToRedshiftFn', () => {
    newServerlessTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          PROJECT_ID: RefAnyValue,
          QUERY_RESULT_LIMIT: RefAnyValue,
          DYNAMODB_TABLE_NAME: RefAnyValue,
          REDSHIFT_MODE: REDSHIFT_MODE.SERVERLESS,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: RefGetAtt,
          REDSHIFT_CLUSTER_IDENTIFIER: '',
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: '',
          REDSHIFT_ROLE: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'Arn',
            ],
          },
          REDSHIFT_DATA_API_ROLE: RefGetAtt,
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 180,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });
    provisionedTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          PROJECT_ID: RefAnyValue,
          QUERY_RESULT_LIMIT: RefAnyValue,
          DYNAMODB_TABLE_NAME: RefAnyValue,
          REDSHIFT_MODE: REDSHIFT_MODE.PROVISIONED,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: Match.anyValue(),
          REDSHIFT_CLUSTER_IDENTIFIER: RefAnyValue,
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: RefAnyValue,
          REDSHIFT_ROLE: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'Arn',
            ],
          },
          REDSHIFT_DATA_API_ROLE: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'Arn',
            ],
          },
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 180,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });
  });

  test('Check LoadDataCheckLoadJobStatusEventRoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:AssignPrivateIpAddresses',
                'ec2:UnassignPrivateIpAddresses',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::GetAtt': [
                    Match.anyValue(),
                    'Arn',
                  ],
                },
                {
                  'Fn::Join': [
                    '',
                    [
                      {
                        'Fn::GetAtt': [
                          Match.anyValue(),
                          'Arn',
                        ],
                      },
                      '/index/*',
                    ],
                  ],
                },
              ],
            },
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Resource: Match.anyValue(),
            },
            {
              Action: 's3:DeleteObject*',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':s3:::',
                    RefAnyValue,
                    '/',
                    RefAnyValue,
                    '*',
                  ],
                ],
              },
            },
          ],
          Version: '2012-10-17',
        },
        PolicyName: Match.anyValue(),
        Roles: [
          RefAnyValue,
        ],
      });
    }
  });

  test('Check LoadODSEventToRedshiftWorkflowCheckLoadJobStatusFn', () => {
    newServerlessTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          PROJECT_ID: RefAnyValue,
          DYNAMODB_TABLE_NAME: RefAnyValue,
          REDSHIFT_MODE: REDSHIFT_MODE.SERVERLESS,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: RefGetAtt,
          REDSHIFT_CLUSTER_IDENTIFIER: '',
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: '',
          REDSHIFT_DATA_API_ROLE: RefGetAtt,
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 120,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });

    provisionedTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          PROJECT_ID: RefAnyValue,
          DYNAMODB_TABLE_NAME: RefAnyValue,
          REDSHIFT_MODE: REDSHIFT_MODE.PROVISIONED,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: Match.anyValue(),
          REDSHIFT_CLUSTER_IDENTIFIER: RefAnyValue,
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: RefAnyValue,
          REDSHIFT_DATA_API_ROLE: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'Arn',
            ],
          },
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 120,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });
  });

  test('Check LoadScheduleRule', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::Events::Rule', {
        ScheduleExpression: RefAnyValue,
        State: 'ENABLED',
        Targets: [
          {
            Arn: RefAnyValue,
            Id: Match.anyValue(),
            RoleArn: {
              'Fn::GetAtt': [
                Match.anyValue(),
                'Arn',
              ],
            },
          },
        ],
      });
    }
  });


  test('Check EMR Serverless Job Run State Change Rule', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::Events::Rule', {
        EventPattern: {
          'source': [
            'aws.emr-serverless',
          ],
          'detail-type': [
            'EMR Serverless Job Run State Change',
          ],
          'detail': {
            state: [
              'SUCCESS',
            ],
            applicationId: [
              {
                Ref: Match.anyValue(),
              },
            ],
          },
        },
        State: 'ENABLED',
        Targets: [
          {
            Arn: {
              Ref: Match.anyValue(),
            },
            Id: 'Target0',
            RoleArn: {
              'Fn::GetAtt': [
                Match.anyValue(),
                'Arn',
              ],
            },
          },
        ],
      });
    }
  });

  test('Check ScanMetadataWorkflowScanMetadataRole', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ScanMetadataWorkflowScanMetadataRole');
      expect(role.resource).toBeDefined();
    }
  });

  test('Check RedshiftServerlessWorkgroupRedshiftServerlessDataAPIRoleDefaultPolicy', () => {
    newServerlessTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'redshift-data:ExecuteStatement',
              'redshift-data:BatchExecuteStatement',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  RefAnyValue,
                  ':redshift-serverless:',
                  RefAnyValue,
                  ':',
                  RefAnyValue,
                  ':workgroup/*',
                ],
              ],
            },
          },
          {
            Action: [
              'redshift-data:DescribeStatement',
              'redshift-data:GetStatementResult',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'redshift-serverless:GetCredentials',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  RefAnyValue,
                  ':redshift-serverless:',
                  RefAnyValue,
                  ':',
                  RefAnyValue,
                  ':workgroup/*',
                ],
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
    });

    provisionedTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'redshift-data:ExecuteStatement',
              'redshift-data:BatchExecuteStatement',
            ],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  RefAnyValue,
                  ':redshift:',
                  RefAnyValue,
                  ':',
                  RefAnyValue,
                  ':cluster:',
                  RefAnyValue,
                ],
              ],
            },
          },
          {
            Action: 'redshift:GetClusterCredentials',
            Condition: {
              StringEquals: {
                'redshift:DbUser': RefAnyValue,
                'redshift:DbName': [
                  Match.anyValue(),
                  RefAnyValue,
                ],
              },
            },
            Effect: 'Allow',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':dbuser:',
                    RefAnyValue,
                    '/',
                    RefAnyValue,
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':dbname:',
                    RefAnyValue,
                    '/',
                    RefAnyValue,
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    RefAnyValue,
                    ':redshift:',
                    RefAnyValue,
                    ':',
                    RefAnyValue,
                    ':dbname:',
                    RefAnyValue,
                    '/',
                    RefAnyValue,
                  ],
                ],
              },
            ],
          },
          {
            Action: [
              'redshift-data:DescribeStatement',
              'redshift-data:GetStatementResult',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: Match.anyValue(),
      Roles: [
        RefAnyValue,
      ],
    });
  });

  test('Check ScanMetadataWorkflowCheckScanMetadataJobStatusRole', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ScanMetadataWorkflowCheckScanMetadataStatusRole');
      expect(role.resource).toBeDefined();
    }
  });

  test('Check ScanMetadataWorkflowStoreMetadataIntoDDBRole', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ScanMetadataWorkflowStoreMetadataIntoDDBRole');
      expect(role.resource).toBeDefined();
    }
  });

  test('Check ScanMetadataWorkflowCheckWorkflowRole', ()=>{
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ScanMetadataWorkflowCheckWorkflowStartRole');
      expect(role.resource).toBeDefined();
    }
  });

  test('Check ScanMetadataWorkflowUpdateWorkflowInfoRole', ()=>{
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ScanMetadataWorkflowUpdateWorkflowInfoRole');
      expect(role.resource).toBeDefined();
    }
  });

  // Check clear expired events lambda
  test('Check ClearExpiredEventsWorkflowClearExpiredEventsRole', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ClearExpiredEventsWorkflowClearExpiredEventsRole');
      expect(role.resource).toBeDefined();
    }
  });

  test('Check ClearExpiredEventsWorkflowClearExpiredEventsRoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:AssignPrivateIpAddresses',
                'ec2:UnassignPrivateIpAddresses',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
            },
          ],
          Version: '2012-10-17',
        },
        PolicyName: Match.anyValue(),
        Roles: [
          RefAnyValue,
        ],
      });
    }
  });

  test('Check ClearExpiredEventsWorkflowClearExpiredEventsFn', () => {
    newServerlessTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          REDSHIFT_MODE: REDSHIFT_MODE.SERVERLESS,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: RefGetAtt,
          REDSHIFT_CLUSTER_IDENTIFIER: '',
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: '',
          REDSHIFT_DATA_API_ROLE: RefGetAtt,
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 120,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });

    provisionedTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          REDSHIFT_MODE: REDSHIFT_MODE.PROVISIONED,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: Match.anyValue(),
          REDSHIFT_CLUSTER_IDENTIFIER: RefAnyValue,
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: RefAnyValue,
          REDSHIFT_DATA_API_ROLE: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'Arn',
            ],
          },
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 120,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });
  });

  test('Check ClearExpiredEventsWorkflowCheckClearJobStatusRole', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ClearExpiredEventsWorkflowCheckClearJobStatusRole');
      expect(role.resource).toBeDefined();
    }
  });

  test('Check ClearExpiredEventsWorkflowCheckClearJobStatusRoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:CreateLogGroup',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'ec2:CreateNetworkInterface',
                'ec2:DescribeNetworkInterfaces',
                'ec2:DeleteNetworkInterface',
                'ec2:AssignPrivateIpAddresses',
                'ec2:UnassignPrivateIpAddresses',
              ],
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
            },
          ],
          Version: '2012-10-17',
        },
        PolicyName: Match.anyValue(),
        Roles: [
          RefAnyValue,
        ],
      });
    }
  });

  test('Check ClearExpiredEventsWorkflowCheckClearJobStatusFn', () => {
    newServerlessTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          REDSHIFT_MODE: REDSHIFT_MODE.SERVERLESS,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: RefGetAtt,
          REDSHIFT_CLUSTER_IDENTIFIER: '',
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: '',
          REDSHIFT_DATA_API_ROLE: RefGetAtt,
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 120,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });

    provisionedTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          REDSHIFT_MODE: REDSHIFT_MODE.PROVISIONED,
          REDSHIFT_SERVERLESS_WORKGROUP_NAME: Match.anyValue(),
          REDSHIFT_CLUSTER_IDENTIFIER: RefAnyValue,
          REDSHIFT_DATABASE: RefAnyValue,
          REDSHIFT_DB_USER: RefAnyValue,
          REDSHIFT_DATA_API_ROLE: {
            'Fn::GetAtt': [
              Match.anyValue(),
              'Arn',
            ],
          },
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 120,
      VpcConfig: {
        SecurityGroupIds: [
          {
            'Fn::GetAtt': [
              Match.anyValue(),
              'GroupId',
            ],
          },
        ],
        SubnetIds: {
          'Fn::Split': [
            ',',
            RefAnyValue,
          ],
        },
      },
    });
  });

  test('Check ClearExpiredEventsWorkflowClearExpiredEventsStateMachineRole', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const role = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Role', 'ClearExpiredEventsWorkflowClearExpiredEventsStateMachineRole');
      expect(role.resource).toBeDefined();
    }
  });

  test('Check ClearExpiredEventsWorkflowClearExpiredEventsStateMachineRoleDefaultPolicy', () => {
    for (const nestedTemplate of allNestedTemplates) {
      const policy = findFirstResourceByKeyPrefix(nestedTemplate, 'AWS::IAM::Policy', 'ClearExpiredEventsWorkflowClearExpiredEventsStateMachineRoleDefaultPolicy');
      expect(policy.resource).toBeDefined();
    }
  });

  test('Check ClearExpiredEventsScheduleRule', () => {
    for (const nestedTemplate of allNestedTemplates) {
      nestedTemplate.hasResourceProperties('AWS::Events::Rule', {
        ScheduleExpression: RefAnyValue,
        State: 'ENABLED',
        Targets: [
          {
            Arn: RefAnyValue,
            Id: Match.anyValue(),
            RoleArn: {
              'Fn::GetAtt': [
                Match.anyValue(),
                'Arn',
              ],
            },
          },
        ],
      });
    }
  });

});

describe('DataAnalyticsRedshiftStack serverless custom resource test', () => {
  const app = new App();
  const testId = 'test-4';
  const stack = new DataAnalyticsRedshiftStack(app, testId + '-data-analytics-redshift-stack-serverless', {});

  test('redshiftServerlessStack has 4 CustomResource', () => {
    Template.fromStack(stack.nestedStacks.redshiftServerlessStack).resourceCountIs('AWS::CloudFormation::CustomResource', 4);
  });

  test('redshiftServerlessStack has CreateApplicationSchemasRedshiftSchemasCustomResource', () => {
    const nestedTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
    nestedTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      ServiceToken: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      projectId: RefAnyValue,
      appIds: RefAnyValue,
      odsTableNames: {
        event: 'event',
        event_parameter: 'event_parameter',
        user: 'user',
        item: 'item',
      },
      databaseName: RefAnyValue,
      dataAPIRole: RefAnyValue,
      lastModifiedTime: Match.anyValue(),
      serverlessRedshiftProps: {
        databaseName: RefAnyValue,
        namespaceId: RefAnyValue,
        workgroupName: RefAnyValue,
        workgroupId: RefAnyValue,
        dataAPIRoleArn: RefAnyValue,
      },
      redshiftBIUserParameter: {
        'Fn::Join': [
          '',
          [
            '/clickstream/reporting/user/',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      redshiftBIUsernamePrefix: 'clickstream_bi_',
      reportingViewsDef: Match.not(Match.absent()),
      schemaDefs: Match.not(Match.absent()),
    });
  });

  test('Should has lambda CreateApplicationSchemasCreateSchemaForApplicationsFn', () => {
    const nestedTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
    nestedTemplate.hasResourceProperties('AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': Match.anyValue(),
        },
        S3Key: Match.anyValue(),
      },
      Role: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      Environment: {
        Variables: {
          POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
          POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
          POWERTOOLS_LOGGER_LOG_EVENT: 'true',
          LOG_LEVEL: 'WARN',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        },
      },
      Handler: 'index.handler',
      MemorySize: Match.anyValue(),
      ReservedConcurrentExecutions: 1,
      Runtime: Match.anyValue(),
      Timeout: 300,
    });
  });

  test('redshiftServerlessStack has LoadODSEventToRedshiftWorkflowRedshiftAssociateIAMRoleCustomResource', () => {
    const nestedTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
    nestedTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      ServiceToken: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      roleArn: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'Arn',
        ],
      },
      serverlessRedshiftProps: {
        workgroupName: RefAnyValue,
      },
    });
  });

  test('Check LoadODSEventToRedshiftWorkflowAssociateIAMRoleFnRoleDefaultPolicy', () => {
    const nestedTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
    nestedTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:CreateLogGroup',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'iam:PassRole',
            Effect: 'Allow',
            Resource: '*',
            Condition: Match.absent(),
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: Match.anyValue(),
      Roles: [
        RefAnyValue,
      ],
    });

    const nestedTemplate2 = Template.fromStack(stack.nestedStacks.redshiftProvisionedStack);
    nestedTemplate2.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:CreateLogGroup',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'iam:PassRole',
            Effect: 'Allow',
            Resource: '*',
            Condition: {
              StringEquals: {
                'iam:PassedToService': 'redshift.amazonaws.com',
              },
            },
          },
        ],
      },
    });
  });

});

describe('DataAnalyticsRedshiftStack tests', () => {
  const app = new App();
  const stack = new DataAnalyticsRedshiftStack(app, 'RedshiftServerlessStack', {});
  const newServerlessStackTemplate = Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack);
  const stackTemplate = Template.fromStack(stack);

  test('[new Redshift workgroup and namespace] Redshift data API role and admin role has trust relation to the same account.', () => {
    const roles = [
      findFirstResourceByKeyPrefix(newServerlessStackTemplate, 'AWS::IAM::Role', 'RedshiftServerelssWorkgroupRedshiftServerlessClickstreamWorkgroupAdminRole'),
      findFirstResourceByKeyPrefix(newServerlessStackTemplate, 'AWS::IAM::Role', 'RedshiftServerelssWorkgroupRedshiftServerlessDataAPIRole'),
    ];
    for (const role of roles) {
      expect(role.resource.Properties.AssumeRolePolicyDocument.Statement[0].Action).toEqual('sts:AssumeRole');
      expect(role.resource.Properties.AssumeRolePolicyDocument.Statement[0].Principal.AWS).toEqual({
        'Fn::Join': [
          '',
          [
            'arn:',
            {
              Ref: 'AWS::Partition',
            },
            ':iam::',
            {
              Ref: 'AWS::AccountId',
            },
            ':root',
          ],
        ],
      });
    }
  });

  test('[new Redshift workgroup and namespace] Redshift Admin role has iam:CreateServiceRole permission.', () => {
    const adminRole = findFirstResourceByKeyPrefix(newServerlessStackTemplate, 'AWS::IAM::Role', 'RedshiftServerelssWorkgroupRedshiftServerlessClickstreamWorkgroupAdminRole');
    let foundInlinePolicy = false;
    for (const policy of adminRole.resource.Properties.Policies) {
      if ('redshift-service-role' === policy.PolicyName) {
        foundInlinePolicy = true;
        expect(policy.PolicyDocument.Statement[0].Action).toEqual('iam:CreateServiceLinkedRole');
        console.log(policy.PolicyDocument.Statement[0].Resource['Fn::Join']);
        expect(policy.PolicyDocument.Statement[0].Resource['Fn::Join'][1][2]).toEqual(':iam::');
        expect(policy.PolicyDocument.Statement[0].Resource['Fn::Join'][1][4]).toMatch(/^:role\/aws-service-role\/redshift\.amazonaws\.com\/AWSServiceRoleForRedshift$/);
      }
    }
    expect(foundInlinePolicy).toBeTruthy();
  });

  test('[new Redshift workgroup and namespace] custom resource for creating redshift serverless namespace', () => {
    newServerlessStackTemplate.resourceCountIs('AWS::RedshiftServerless::Namespace', 0);
    const customResource = findFirstResourceByKeyPrefix(newServerlessStackTemplate, 'AWS::CloudFormation::CustomResource', 'RedshiftServerelssWorkgroupCreateRedshiftServerlessNamespaceCustomResource');
    expect(customResource.resource.Properties.adminRoleArn).toBeDefined();
    expect(customResource.resource.Properties.namespaceName).toBeDefined();
    expect(customResource.resource.Properties.databaseName).toBeDefined();
  });

  test('[new Redshift workgroup and namespace] Cfn workgroup defined as expect', () => {
    newServerlessStackTemplate.resourceCountIs('AWS::RedshiftServerless::Workgroup', 1);
    newServerlessStackTemplate.hasResourceProperties('AWS::RedshiftServerless::Workgroup', {
      WorkgroupName: RefAnyValue,
      BaseCapacity: RefAnyValue,
      EnhancedVpcRouting: false,
      NamespaceName: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'NamespaceName',
        ],
      },
      PubliclyAccessible: false,
      SecurityGroupIds: {
        'Fn::Split': [
          ',',
          RefAnyValue,
        ],
      },
      SubnetIds: {
        'Fn::Split': [
          ',',
          RefAnyValue,
        ],
      },
    });
  });

  test('[new Redshift workgroup and namespace] Resources order - custom resource for creating database must depend on SQLExecutionStateMachine/creating db user', () => {
    const customResource = findFirstResourceByKeyPrefix(newServerlessStackTemplate, 'AWS::CloudFormation::CustomResource', 'CreateApplicationSchemasRedshiftSchemasCustomResource7AA8CC71');
    expect(customResource.resource.DependsOn[0]).toContain('CreateApplicationSchemasSQLExecutionStateMachine');
    expect(customResource.resource.DependsOn[3]).toContain('RedshiftServerelssWorkgroupCreateRedshiftServerlessMappingUserCustomResource');
  });

  test('stack outputs', () => {
    stackTemplate.hasOutput(`ProvisionedRedshift${OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX}`, {
      Condition: 'redshiftProvisioned',
    });
    stackTemplate.hasOutput(`ExistingRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX}`, {
      Condition: 'existingRedshiftServerless',
    });
    stackTemplate.hasOutput(`NewRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX}`, {
      Condition: 'newRedshiftServerless',
    });
    stackTemplate.hasOutput(`ProvisionedRedshift${OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX}`, {
      Condition: 'redshiftProvisioned',
    });
    stackTemplate.hasOutput(`ExistingRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX}`, {
      Condition: 'existingRedshiftServerless',
    });
    stackTemplate.hasOutput(`NewRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX}`, {
      Condition: 'newRedshiftServerless',
    });
    stackTemplate.hasOutput(OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME, {
      Condition: 'newRedshiftServerless',
    });
    stackTemplate.hasOutput(OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_NAMESPACE_NAME, {
      Condition: 'newRedshiftServerless',
    });
    stackTemplate.hasOutput(OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_ADDRESS, {
      Condition: 'newRedshiftServerless',
    });
    stackTemplate.hasOutput(OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_PORT, {
      Value: '5439',
      Condition: 'newRedshiftServerless',
    });
    stackTemplate.hasOutput(`ProvisionedRedshift${OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX}`, {
      Condition: 'redshiftProvisioned',
    });
    stackTemplate.hasOutput(`ExistingRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX}`, {
      Condition: 'existingRedshiftServerless',
    });
    stackTemplate.hasOutput(`NewRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX}`, {
      Condition: 'newRedshiftServerless',
    });
    stackTemplate.hasOutput(`ProvisionedRedshift${OUTPUT_DATA_MODELING_REDSHIFT_SQL_EXECUTION_STATE_MACHINE_ARN_SUFFIX}`, {
      Condition: 'redshiftProvisioned',
    });
    stackTemplate.hasOutput(`ExistingRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_SQL_EXECUTION_STATE_MACHINE_ARN_SUFFIX}`, {
      Condition: 'existingRedshiftServerless',
    });
    stackTemplate.hasOutput(`NewRedshiftServerless${OUTPUT_DATA_MODELING_REDSHIFT_SQL_EXECUTION_STATE_MACHINE_ARN_SUFFIX}`, {
      Condition: 'newRedshiftServerless',
    });
  });

  test('Custom resource - creating namespace with permissions to list tags of lambda function', () => {
    newServerlessStackTemplate.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'lambda:ListTags',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                'RedshiftServerelssWorkgroupCreateNamespaceFnDFB451B3',
                'Arn',
              ],
            },
          },
        ],
      },
      Roles: [
        {
          Ref: 'RedshiftServerelssWorkgroupCreateRedshiftNamespaceRole1AD307CB',
        },
      ],
    });

    newServerlessStackTemplate.hasResource('AWS::CloudFormation::CustomResource', {
      Properties: {
        adminRoleArn: Match.anyValue(),
        namespaceName: Match.anyValue(),
        databaseName: Match.anyValue(),
      },
      DependsOn: [
        'RedshiftServerelssWorkgroupCreateNamespaceFunclistTagsPolicy4F76CE76',
      ],
    });
  });

  test('Force to add built-in tags in serverless workgroup', () => {
    newServerlessStackTemplate.hasResourceProperties('AWS::RedshiftServerless::Workgroup', {
      Tags: Match.arrayWith([
        Match.objectEquals({
          Key: BuiltInTagKeys.AWS_SOLUTION,
          Value: SolutionInfo.SOLUTION_SHORT_NAME,
        }),
        Match.objectEquals({
          Key: BuiltInTagKeys.AWS_SOLUTION_VERSION,
          Value: SolutionInfo.SOLUTION_VERSION,
        }),
      ]),
    });
  });

  test('Should has ApplicationArnCondition', () => {
    stackTemplate.hasCondition('ApplicationArnCondition', {
      'Fn::Not': [
        {
          'Fn::Equals': [
            {
              Ref: 'AppRegistryApplicationArn',
            },
            '',
          ],
        },
      ],
    });
  });

  test('Should has AppRegistryAssociation', () => {
    stackTemplate.hasResourceProperties('AWS::ServiceCatalogAppRegistry::ResourceAssociation', {
      Application: {
        'Fn::Select': [
          2,
          {
            'Fn::Split': [
              '/',
              {
                'Fn::Select': [
                  5,
                  {
                    'Fn::Split': [
                      ':',
                      {
                        Ref: 'AppRegistryApplicationArn',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      Resource: {
        Ref: 'AWS::StackId',
      },
      ResourceType: 'CFN_STACK',
    });
  });
});


describe('Should set metrics widgets', () => {
  const app = new App();
  const stack = new DataAnalyticsRedshiftStack(app, 'RedshiftServerlessStack', {});
  const newServerlessTemplate = Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack);
  const existingServerlessTemplate = Template.fromStack(stack.nestedStacks.redshiftServerlessStack);
  const provisionTemplate = Template.fromStack(stack.nestedStacks.redshiftProvisionedStack);

  test('Should set metrics widgets for new redshiftServerless', () => {
    newServerlessTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      metricsWidgetsProps: {
        order: WIDGETS_ORDER.redshiftServerless,
        projectId: Match.anyValue(),
        name: Match.anyValue(),
        description: {
          markdown: Match.anyValue(),
        },
        widgets: Match.anyValue(),
      },
    });

    newServerlessTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {

      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Load event workflow failed, projectId: ',
            Match.anyValue(),
          ],
        ],
      },

      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'intervalSeconds',
        ],
      },
    });

    newServerlessTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Scan metadata workflow failed, projectId: ',
            Match.anyValue(),
          ],
        ],
      },

      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'scanWorkflowMinIntervalSeconds',
        ],
      },
    });

    newServerlessTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Max file age more than ',
            {
              'Fn::GetAtt': [
                Match.anyValue(),
                'intervalSeconds',
              ],
            },
            ' seconds, projectId: ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },

      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'intervalSeconds',
        ],
      },
    });

  });


  test('Should set metrics widgets for existing redshiftServerless', () => {
    existingServerlessTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      metricsWidgetsProps: {
        order: WIDGETS_ORDER.redshiftServerless,
        projectId: Match.anyValue(),
        name: Match.anyValue(),
        description: {
          markdown: Match.anyValue(),
        },
        widgets: Match.anyValue(),
      },
    });

    existingServerlessTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Load event workflow failed, projectId: ',
            Match.anyValue(),
          ],
        ],
      },

      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'intervalSeconds',
        ],
      },
    });


    newServerlessTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Scan metadata workflow failed, projectId: ',
            Match.anyValue(),
          ],
        ],
      },

      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'scanWorkflowMinIntervalSeconds',
        ],
      },
    });

    existingServerlessTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Max file age more than ',
            {
              'Fn::GetAtt': [
                Match.anyValue(),
                'intervalSeconds',
              ],
            },
            ' seconds, projectId: ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'intervalSeconds',
        ],
      },
    });

  });

  test('Should set metrics widgets for provisioned Redshift Cluster', () => {
    provisionTemplate.hasResourceProperties('AWS::CloudFormation::CustomResource', {
      metricsWidgetsProps: {
        order: WIDGETS_ORDER.redshiftProvisionedCluster,
        projectId: Match.anyValue(),
        name: Match.anyValue(),
        description: {
          markdown: Match.anyValue(),
        },
        widgets: Match.arrayWith([
          Match.objectLike({
            type: 'alarm',
            properties: {
              alarms: Match.arrayWith([
                Match.objectLike({ 'Fn::GetAtt': Match.anyValue() }),
                Match.objectLike({ 'Fn::GetAtt': Match.anyValue() }),
                Match.objectLike({ 'Fn::GetAtt': Match.anyValue() }),
              ]),
              title: Match.anyValue(),
            },
          }),
        ]),
      },
    });

    provisionTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Load event workflow failed, projectId: ',
            Match.anyValue(),
          ],
        ],
      },

      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'intervalSeconds',
        ],
      },
    });


    newServerlessTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Scan metadata workflow failed, projectId: ',
            Match.anyValue(),
          ],
        ],
      },

      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'scanWorkflowMinIntervalSeconds',
        ],
      },
    });

    provisionTemplate.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmDescription: {
        'Fn::Join': [
          '',
          [
            'Max file age more than ',
            {
              'Fn::GetAtt': [
                Match.anyValue(),
                'intervalSeconds',
              ],
            },
            ' seconds, projectId: ',
            {
              Ref: Match.anyValue(),
            },
          ],
        ],
      },
      TreatMissingData: TreatMissingData.NOT_BREACHING,
      Period: {
        'Fn::GetAtt': [
          Match.anyValue(),
          'intervalSeconds',
        ],
      },
    });

  });
});



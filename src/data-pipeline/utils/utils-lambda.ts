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
import { CfnResource, Duration } from 'aws-cdk-lib';

import { IVpc, SecurityGroup, SubnetSelection } from 'aws-cdk-lib/aws-ec2';
import { Runtime, Tracing, Function } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { RoleUtil } from './utils-role';
import { addCfnNagSuppressRules, addCfnNagToSecurityGroup, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions } from '../../common/cfn-nag';
import { POWERTOOLS_ENVS } from '../../common/powertools';

interface Props {
  readonly vpc: IVpc;
  readonly vpcSubnets: SubnetSelection;
  readonly projectId: string;
  readonly appIds: string;
  readonly sourceS3Bucket: string;
  readonly sourceS3Prefix: string;
  readonly sinkS3Bucket: string;
  readonly sinkS3Prefix: string;
}


const functionSettings = {
  handler: 'handler',
  runtime: Runtime.NODEJS_16_X,
  memorySize: 256,
  timeout: Duration.minutes(15),
  logRetention: RetentionDays.ONE_WEEK,
  tracing: Tracing.ACTIVE,
};

export class LambdaUtil {
  public static newInstance(scope: Construct, props: Props, roleUtil: RoleUtil) {
    return new this(scope, props, roleUtil);
  }

  private readonly props: Props;
  private readonly scope: Construct;
  private readonly roleUtil: RoleUtil;

  private constructor(scope: Construct, props: Props, roleUtil: RoleUtil) {
    this.props = props;
    this.scope = scope;
    this.roleUtil = roleUtil;
  }

  public createPartitionSyncerLambda(databaseName: string, sourceTableName: string, sinkTableName: string): Function {
    const lambdaRole = this.roleUtil.createPartitionSyncerRole('partitionSyncerLambdaRole', databaseName, sourceTableName, sinkTableName);
    const lambdaSecurityGroup = this.createSecurityGroup(this.scope, this.props.vpc, 'lambdaPartitionSyncer'
      , 'Security group for Glue partition syncer lambda');
    const fn = new NodejsFunction(
      this.scope,
      'GlueTablePartitionSyncerFunction',
      {
        vpc: this.props.vpc,
        vpcSubnets: this.props.vpcSubnets,
        securityGroups: [lambdaSecurityGroup],
        role: lambdaRole,
        entry: join(__dirname, '..', 'lambda', 'partition-syncer', 'index.ts'),
        environment: {
          SOURCE_S3_BUCKET_NAME: this.props.sourceS3Bucket,
          SOURCE_S3_PREFIX: this.props.sourceS3Prefix,
          SINK_S3_BUCKET_NAME: this.props.sinkS3Bucket,
          SINK_S3_PREFIX: this.props.sinkS3Prefix,
          DATABASE_NAME: databaseName,
          SOURCE_TABLE_NAME: sourceTableName,
          SINK_TABLE_NAME: sinkTableName,
          PROJECT_ID: this.props.projectId,
          APP_IDS: this.props.appIds,
          ... POWERTOOLS_ENVS,
        },
        ...functionSettings,
      },
    );
    addCfnNagSuppressRules(fn.node.defaultChild as CfnResource, rulesToSuppressForLambdaVPCAndReservedConcurrentExecutions('cdk'));
    return fn;
  }

  private createSecurityGroup(scope: Construct, vpc: IVpc, id: string, description: string): SecurityGroup {
    const sg = new SecurityGroup(scope, id, {
      description,
      vpc,
      allowAllOutbound: true,
    });
    addCfnNagToSecurityGroup(sg, ['W40', 'W5']);
    return sg;
  }
}
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

import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { CloudWatchEventsClient } from '@aws-sdk/client-cloudwatch-events';
import { EC2Client } from '@aws-sdk/client-ec2';
import { IAMClient } from '@aws-sdk/client-iam';
import { KafkaClient } from '@aws-sdk/client-kafka';
import { QuickSightClient } from '@aws-sdk/client-quicksight';
import { RedshiftClient } from '@aws-sdk/client-redshift';
import { RedshiftServerlessClient } from '@aws-sdk/client-redshift-serverless';
import { S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { SFNClient } from '@aws-sdk/client-sfn';
import { SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sfnMock = mockClient(SFNClient);
const cloudFormationMock = mockClient(CloudFormationClient);
const kafkaMock = mockClient(KafkaClient);
const redshiftMock = mockClient(RedshiftClient);
const redshiftServerlessMock = mockClient(RedshiftServerlessClient);
const secretsManagerMock = mockClient(SecretsManagerClient);
const ec2Mock = mockClient(EC2Client);
const quickSightMock = mockClient(QuickSightClient);
const s3Mock = mockClient(S3Client);
const iamMock = mockClient(IAMClient);
const cloudWatchEventsMock = mockClient(CloudWatchEventsClient);
const snsMock = mockClient(SNSClient);

export const mockClients = {
  ddbMock,
  sfnMock,
  cloudFormationMock,
  kafkaMock,
  redshiftMock,
  redshiftServerlessMock,
  secretsManagerMock,
  ec2Mock,
  quickSightMock,
  s3Mock,
  iamMock,
  cloudWatchEventsMock,
  snsMock,
};

export function resetAllMockClient(): void {
  mockClients.ddbMock.reset();
  mockClients.sfnMock.reset();
  mockClients.cloudFormationMock.reset();
  mockClients.kafkaMock.reset();
  mockClients.redshiftMock.reset();
  mockClients.redshiftServerlessMock.reset();
  mockClients.secretsManagerMock.reset();
  mockClients.ec2Mock.reset();
  mockClients.quickSightMock.reset();
  mockClients.s3Mock.reset();
  mockClients.iamMock.reset();
  mockClients.cloudWatchEventsMock.reset();
  mockClients.snsMock.reset();
}



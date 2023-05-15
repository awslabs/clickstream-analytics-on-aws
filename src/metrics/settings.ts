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


export const WIDGETS_HEIGHT = 6;
export const DESCRIPTION_HEIGHT = 1;
export const PARAMETERS_DESCRIPTION = 'Clickstream Metrics';

export const WIDGETS_ORDER = {
  ingestionServer: 200,

  kafkaCluster: 240,
  kafkaS3Connector: 250,
  kinesisDataStream: 260,

  dataPipelineETL: 300,

  redshiftServerless: 400,
  redshiftProvisionedCluster: 450,
};
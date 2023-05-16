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

export class SolutionInfo {

  static SOLUTION_ID = 'SO0219';
  static SOLUTION_NAME = 'Clickstream Analytics on AWS';
  static SOLUTION_SHORT_NAME = 'Clickstream';
  static SOLUTION_VERSION = process.env.SOLUTION_VERSION || 'v1.0.0';
  static DESCRIPTION = `(${SolutionInfo.SOLUTION_ID}) ${SolutionInfo.SOLUTION_NAME} (Version ${SolutionInfo.SOLUTION_VERSION})`;
  static ETL_VERSION = process.env.ETL_VERSION || '1.0.0';
}
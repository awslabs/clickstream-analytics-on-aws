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

export interface Project {
  projectId: string;
  type: string;
  name: string;
  tableName: string;
  description: string;
  emails: string;
  platform: string;
  region: string;
  environment: string;
  status: string;
  createAt: number;
  updateAt: number;
  operator: string;
  deleted: boolean;
}

export interface ProjectList {
  totalCount: number | undefined;
  items: Project[];
}

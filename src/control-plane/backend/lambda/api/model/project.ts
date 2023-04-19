import { ProjectEnvironment } from '../common/types';

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

export interface IProject {
  readonly id: string;
  readonly type: string;
  readonly prefix: string;

  readonly name: string;
  readonly description: string;
  readonly emails: string;
  readonly platform: string;
  readonly region: string;
  readonly environment: ProjectEnvironment | string;
  readonly status: string;
  readonly createAt: number;
  readonly updateAt: number;
  readonly operator: string;
  readonly deleted: boolean;
}

export interface IProjectList {
  totalCount: number | undefined;
  items: IProject[];
}

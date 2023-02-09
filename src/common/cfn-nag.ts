/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Aspects, CfnResource, IAspect, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

/**
 * cfn-nag suppression rule interface
 */
interface CfnNagSuppressRule {
  readonly id: string;
  readonly reason: string;
}

export function addCfnNagSuppressRules(
  resource: CfnResource,
  rules: CfnNagSuppressRule[],
) {
  resource.addMetadata('cfn_nag', {
    rules_to_suppress: rules,
  });
}

export interface AddCfnNagItem {
  readonly paths_endswith: string[];
  readonly rules_to_suppress: CfnNagSuppressRule[];
}

export function addCfnNagToStack(stack: Stack, cfnNagList: AddCfnNagItem[]) {
  Aspects.of(stack).add(new AddCfnNagForCdkPath(cfnNagList));
}

class AddCfnNagForCdkPath implements IAspect {
  cfnNagList: AddCfnNagItem[];
  constructor(cfnNagList: AddCfnNagItem[]) {
    this.cfnNagList = cfnNagList;
  }
  visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      for (const nagConfig of this.cfnNagList) {
        for (const path of nagConfig.paths_endswith) {
          if (
            node.node.path.endsWith(path) ||
            node.node.path.match(new RegExp(path + '$'))
          ) {
            (node as CfnResource).addMetadata('cfn_nag', {
              rules_to_suppress: nagConfig.rules_to_suppress,
            });
          }
        }
      }
    }
  }
}


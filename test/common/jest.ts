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

import { rmdir } from 'fs';
import {
  App, AppProps,
} from 'aws-cdk-lib';

export function removeFolder(tmpFolder: string) {
  rmdir(tmpFolder, { recursive: true }, (err) => {
    if (err) {
      // Handle error
      console.error(`Failed to remove folder ${tmpFolder}.`);
      console.error(err);
    } else {
      // Folder deleted successfully
    }
  });
};

export class TestApp extends App {
  constructor(outdir: string, props?: AppProps) {
    super({
      ...props,
      autoSynth: false,
      outdir,
    });
  }
}
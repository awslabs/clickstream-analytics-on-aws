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
const path = require("path");
const { Component, YamlFile } = require("projen");
// Custom projen component that generates pnpm-workspace.yaml
// and defines the monorepo packages based on the subprojects.
class PnpmWorkspace extends Component {
  constructor(rootProject) {
    super(rootProject);

    new YamlFile(rootProject, "pnpm-workspace.yaml", {
      obj: {
        packages: rootProject.subprojects.map((project) =>
          path.relative(rootProject.outdir, project.outdir)
        ),
      },
    });
  }
}
module.exports = PnpmWorkspace;

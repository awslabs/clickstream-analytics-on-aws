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
const { Component, JsonFile } = require('projen');

/**
 * Custom projen component that configures nx.
 */
class Nx extends Component {
  constructor(rootProject) {
    super(rootProject);

    // Add nx library dependencies
    rootProject.addDevDeps('nx@^15', '@nrwl/devkit@^15', '@nrwl/workspace@^15');

    // Add nx.json file
    new JsonFile(rootProject, 'nx.json', {
      obj: {
        extends: 'nx/presets/npm.json',
        tasksRunnerOptions: {
          default: {
            runner: '@nrwl/workspace/tasks-runners/default',
            options: {
              /*
                By default nx uses a local cache to prevent
                re-running targets that have not had their inputs changed
                (e.g. no changes to source files).
                The following specifies what targets are cacheable.
              */
              cacheableOperations: ['build']
            },
          },
        },
        targetDefaults: {
          build: {
            /*
              Specifies the build target of a project is dependent on
              the build target of dependant projects (via the caret)
            */
            dependsOn: ['^build'],

            /*
              Inputs tell nx which files can invalidate the cache should
              they updated. We only want the build target cache to be
              invalidated if there are changes to source files so the config
              below ignores output files.
            */
            inputs: [
              '!{projectRoot}/test-reports/**/*',
              '!{projectRoot}/coverage/**/*',
              '!{projectRoot}/build/**/*',
              '!{projectRoot}/dist/**/*',
              '!{projectRoot}/lib/**/*',
              '!{projectRoot}/cdk.out/**/*'
            ],

            /*
              Outputs tell nx where artifacts can be found. The need for
              this will become more obvious when we configure github action
              workflows and need to restore the nx cache for subsequent jobs
              to fetch artifacts
            */
            outputs: [
              "{projectRoot}/dist",
              "{projectRoot}/lib",
              "{projectRoot}/cdk.out"
            ]
          },
          deploy: { dependsOn: ['build'] }
        },
        /*
          This is used when running 'nx affected ....' command
          to selectively run targets against only those packages
          that have changed since lastest commit on origin/main
        */
        affected: { defaultBase: 'origin/main' },
      },
    });
  }
}

// Replace export statement with module.exports
module.exports = Nx;

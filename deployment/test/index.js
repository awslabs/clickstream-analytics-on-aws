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

const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'global-s3-assets');
fs.readdirSync(source, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name)
  .forEach(
    d => {
      fs.readdirSync(path.join(source, d)).filter(f => f.endsWith('.template.json') && f.startsWith('ingestionserver'))
        .forEach(t => check_cross_stack_policy(path.join(source, d), t));
        
      fs.readdirSync(path.join(source, d)).filter(f => f.endsWith('.template.json') && f.startsWith('ingestion-server'))
        .forEach(t => check_cross_stack_output(path.join(source, d), t));
    }  
  );

function check_cross_stack_policy(d, file_name) {
  const template_file = path.join(d, file_name);
  console.log(`check template ${template_file}`)
  const raw_template = fs.readFileSync(template_file);
  const template = JSON.parse(raw_template);

  const Resources = template.Resources;

  var hasECSCluster = false;
  // check if ExportsOutput exists in output
  if (Resources) {
    for (const k of Object.keys(Resources)) {
      if (k.startsWith('CrossAccountECR') &&
        Resources[k]['Type'] == 'AWS::IAM::Policy') {
        return;
      }
      if (Resources[k]['Type'] == 'AWS::ECS::Cluster') {
        hasECSCluster = true;
      }
    }
  }
  if (hasECSCluster)
    throw new Error(`Not found cross account ECR pull permission in template ${template_file}`);
}

function check_cross_stack_output(d, file_name) {
  const template_file = path.join(d, file_name);
  console.log(`check template ${template_file}`)
  const raw_template = fs.readFileSync(template_file);
  const template = JSON.parse(raw_template);

  const Outputs = template.Outputs;

  // check if ExportsOutput exists in output
  if (Outputs) {
    for (const k of Object.keys(Outputs)) {
      if (k.startsWith('ExportsOutput')) {
        throw new Error(`Found unexpected cross-stacks ouptut in template ${template_file}`);
      }
    }
  }
}
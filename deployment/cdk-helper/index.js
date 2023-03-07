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

[
  path.join(__dirname, '..', 'global-s3-assets', 'cn'),
  path.join(__dirname, '..', 'global-s3-assets', 'default'),
].forEach(d => {
  fs.readdirSync(d).filter(f => f.endsWith('.template.json') && f.startsWith('ingestion-server'))
  .forEach(t => process_template(d, t))
});

function process_template(d, file_name) {
  const template_file = path.join(d, file_name);
  console.log(`process_template ${template_file}`)
  const output_file = template_file;
  const raw_template = fs.readFileSync(template_file);
  const template = JSON.parse(raw_template);

  const Outputs = template.Outputs;

  // remove ExportsOutput in output
  if (Outputs) {
    for (const k of Object.keys(Outputs)) {
      if (k.startsWith('ExportsOutput')) {
        delete Outputs[k]
      }
    }
  }
  const output_template = JSON.stringify(template, null, 2);
  fs.writeFileSync(output_file, output_template);
}
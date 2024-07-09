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

const outTagImageShellFile = process.env.OUT_TAG_IMAGE_SHELL_FILE || 'tag-images.sh';
const solutionEcrRepoName = process.env.SOLUTION_ECR_REPO_NAME || 'clickstream-analytics-on-aws';
const publicECRRegistry = process.env.PUBLIC_ECR_REGISTRY;
const publicECRTag = process.env.PUBLIC_ECR_TAG;

const isInGlobalPipeline = process.env.DIST_OUTPUT_BUCKET == 'aws-gcr-solutions' ? false : true;

const source = path.join(__dirname, '..', 'global-s3-assets');

if (isInGlobalPipeline) {
  fs.readdirSync(source)
    .filter(f => f.endsWith('.template.json'))
    .forEach(t => check_ecr_images(source, t))

} else {
  fs.readdirSync(source, {
    withFileTypes: true
  })
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
  check_tag_images_file();
}

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
        throw new Error(`Found unexpected cross-stacks output in template ${template_file}`);
      }
    }
  }
}

function check_ecr_images(d, file_name) {
  const template_file = path.join(d, file_name);
  const raw_template = fs.readFileSync(template_file);
  const template = JSON.parse(raw_template);
  const taskDef = getResourcesByType(template, 'AWS::ECS::TaskDefinition');

  if (taskDef.length > 0) {
    console.log(`isInGlobalPipeline: ${isInGlobalPipeline}, check check_ecr_images for ${template_file}`);

    taskDef[0].Properties.ContainerDefinitions.map(c => c['Image']['Fn::Sub']).forEach(ecrUri => {
      if (!(ecrUri.startsWith(`${publicECRRegistry}`) && ecrUri.endsWith(`:${publicECRTag}`))) {
        console.log(ecrUri);

        console.log(`${publicECRRegistry}`);
        console.log(`${solutionEcrRepoName}:${publicECRTag}`);

        throw new Error("ECR URI Error");
      }
    });
  }
}


function getResourcesByType(template, resourceType) {
  const resources = [];
  const resourcesKeys = Object.keys(template.Resources)
  for (const rKey of resourcesKeys) {
    if (template.Resources[rKey].Type == resourceType) {
      resources.push(template.Resources[rKey]);
    }
  }
  if (resources.length > 0) {
    console.log(`find ${resources.length} ${resourceType}`);
  }
  return resources;
}

function check_tag_images_file() {
  const outPath = path.join(__dirname, '..', outTagImageShellFile);
  fs.existsSync(outPath);
}
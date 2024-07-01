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

// Imports
const fs = require('fs');
const _regex = /[\w]*AssetParameters/g; //this regular express also takes into account lambda functions defined in nested stacks

// Paths
const global_s3_assets = '../global-s3-assets';

// For each template in global_s3_assets ...
fs.readdirSync(global_s3_assets).forEach(file => {

  // Import and parse template file
  const raw_template = fs.readFileSync(`${global_s3_assets}/${file}`);
  let template = JSON.parse(raw_template);

  // Clean-up Lambda function code dependencies
  const resources = (template.Resources) ? template.Resources : {};
  const lambdaFunctions = Object.keys(resources).filter(function (key) {
    return resources[key].Type === "AWS::Lambda::Function";
  });
  lambdaFunctions.forEach(function (f) {
    const fn = template.Resources[f];
    if (fn.Properties.Code.hasOwnProperty('S3Bucket')) {
      // Set the S3 key reference
      let s3Key = Object.assign(fn.Properties.Code.S3Key);
      // https://github.com/aws/aws-cdk/issues/10608
      if (!s3Key.endsWith('.zip')) {
        fn.Properties.Code.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}.zip`;
      } else {
        fn.Properties.Code.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}`;
      }
      // Set the S3 bucket reference
      fn.Properties.Code.S3Bucket = {
        'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
      };
    }
  });

  // Clean-up Lambda Layer code dependencies
  const lambdaLayers = Object.keys(resources).filter(function (key) {
    return resources[key].Type === "AWS::Lambda::LayerVersion";
  })
  lambdaLayers.forEach(function (l) {
    const layer = template.Resources[l];
    if (layer.Properties.Content.hasOwnProperty('S3Bucket')) {
      let s3Key = Object.assign(layer.Properties.Content.S3Key);
      layer.Properties.Content.S3Key = `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}`;
      layer.Properties.Content.S3Bucket = {
        'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
      }
    }
  })

  // Clean-up Custom::CDKBucketDeployment
  const bucketDeployments = Object.keys(resources).filter(function (key) {
    return resources[key].Type === "Custom::CDKBucketDeployment"
  })
  bucketDeployments.forEach(function (d) {
    const deployment = template.Resources[d];
    if (deployment.Properties.hasOwnProperty('SourceBucketNames')) {
      deployment.Properties.SourceBucketNames = deployment.Properties.SourceBucketNames.map(
        (_) => {
          return {
            'Fn::Sub': '%%BUCKET_NAME%%-${AWS::Region}'
          }
        }
      )
    }
    if (deployment.Properties.hasOwnProperty('SourceObjectKeys')) {
      deployment.Properties.SourceObjectKeys = deployment.Properties.SourceObjectKeys.map(
        (key) => {
          let s3Key = Object.assign(key);
          return `%%SOLUTION_NAME%%/%%VERSION%%/${s3Key}`;
        }
      )
    }
  })

  // Clean-up CustomCDKBucketDeployment Policy
  const bucketDeploymentsPolicy = Object.keys(resources).filter(function (key) {
    return key.startsWith("CustomCDKBucketDeployment") && resources[key].Type === "AWS::IAM::Policy"
  })

  bucketDeploymentsPolicy.forEach(function (d) {
    const policy = template.Resources[d];
    let resources = policy.Properties.PolicyDocument.Statement[0].Resource
    resources.forEach((res) => {
      res['Fn::Join'].forEach((key) => {
        if (key[2] == ':s3:::') {
          key[3]['Fn::Sub'] = '%%BUCKET_NAME%%-${AWS::Region}'
        }
      })
    })
  })

  // For the below code to work with nested templates, the nested template file has to
  // be added as metadata to the construct in the CDK code.
  //
  // const myNestedTemplate = new MyNestedStack(this, 'NestedStack', {
  //     parameters: {
  //         "FirstParameter": <some parameter 1>,
  //         "SecondParameter": <some parameter 2>,
  //         "SolutionID": solutionID,
  //         "SolutionName": solutionName,
  //         "ParentStackName": Aws.STACK_NAME
  //     }
  // });

  // The slice at the end of the statement is to remove the ".json" extension. Since all templates are published ".template"

  // myNestedTemplate.nestedStackResource!.addMetadata('nestedStackFileName', myNestedTemplate.templateFile.slice(0, -(".json".length)));

  // The below block of code has been tested to work with single nesting levels. This block of code has not been tested for multilevel
  // nesting of stacks

  const nestedStacks = Object.keys(resources).filter(function (key) {
    return resources[key].Type === "AWS::CloudFormation::Stack";
  });

  nestedStacks.forEach(function (f) {
    const fn = template.Resources[f];
    const templateName = fn.Metadata['aws:asset:path'];

    fn.Properties.TemplateURL = {
      'Fn::Join': [
        '',
        [
          'https://%%TEMPLATE_OUTPUT_BUCKET%%.s3.',
          {
            'Ref': 'AWS::URLSuffix'
          },
          '/',
          `%%SOLUTION_NAME%%/%%VERSION%%/${templateName}`
        ]
      ]
    };

    const params = fn.Properties.Parameters ? fn.Properties.Parameters : {};
    const nestedStackParameters = Object.keys(params).filter(function (key) {
      if (key.search(_regex) > -1) {
        return true;
      }
      return false;
    });

    nestedStackParameters.forEach(function (stkParam) {
      fn.Properties.Parameters[stkParam] = undefined;
    })
  });


  updateECRImagesForECSTaskDefinition(template);

  // Clean-up parameters section
  const parameters = (template.Parameters) ? template.Parameters : {};
  const assetParameters = Object.keys(parameters).filter(function (key) {
    if (key.search(_regex) > -1) {
      return true;
    }
    return false;
  });
  assetParameters.forEach(function (a) {
    template.Parameters[a] = undefined;
  });

  // Clean-up BootstrapVersion parameter
  if (parameters.hasOwnProperty('BootstrapVersion')) {
    parameters.BootstrapVersion = undefined
  }

  // Clean-up CheckBootstrapVersion Rule
  const rules = (template.Rules) ? template.Rules : {};
  if (rules.hasOwnProperty('CheckBootstrapVersion')) {
    rules.CheckBootstrapVersion = undefined
  }

  //minification reporting stack
  const indent = file.includes('reporting-quicksight-stack') ? undefined : 1;
  const output_template = JSON.stringify(template, null, indent);
  
  fs.writeFileSync(`${global_s3_assets}/${file}`, output_template);
});


function updateECRImagesForECSTaskDefinition(template) {
  const taskDefs = getResourcesByType(template, 'AWS::ECS::TaskDefinition');

  for (let tDef of taskDefs) {
    const resourceName = tDef.Metadata['aws:cdk:path'].split("/").slice(-2, -1);
    for (let cDef of tDef.Properties.ContainerDefinitions) {
      const cName = cDef.Name;
      // TODO change back to cName
      const repoSuffix = cName === 'worker' ? 'vector' : 'nginx';
      const newImage = `%%PUBLIC_ECR_REGISTRY%%/clickstream-${repoSuffix}:%%PUBLIC_ECR_TAG%%`;

      cDef.Image["Fn::Sub"] = newImage;

    }
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
  return resources;
}

function getFirstResource(template, resourceType, cdkPathEndWith) {
  const resourcesKeys = Object.keys(template.Resources)
  for (const rKey of resourcesKeys) {
    if (template.Resources[rKey].Type == resourceType &&
      template.Resources[rKey].Metadata['aws:cdk:path'].endsWith(cdkPathEndWith)) {
      return {
        resource: template.Resources[rKey],
        key: rKey
      };
    }
  }
  return {
    resource: undefined,
    key: undefined
  };
}
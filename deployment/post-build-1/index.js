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
const solutionEcrAccount = process.env.SOLUTION_ECR_ACCOUNT;
const solutionEcrRepoName = process.env.SOLUTION_ECR_REPO_NAME || 'test-clickstream-analytics-on-aws';
const solutionEcrBuildVersion = process.env.BUILD_VERSION;
const awsRegion = process.env.AWS_REGION || 'us-east-1';
const awsProfile = process.env.AWS_DEFAULT_PROFILE || 'default';
const buildPlatform = process.env.BUILD_PLATFORM || 'linux/amd64';

// Debug environment variables
console.log('Environment variables:');
console.log('BUILD_VERSION:', process.env.BUILD_VERSION);
console.log('SOLUTION_ECR_ACCOUNT:', process.env.SOLUTION_ECR_ACCOUNT);
console.log('SOLUTION_ECR_REPO_NAME:', process.env.SOLUTION_ECR_REPO_NAME);
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AWS_DEFAULT_PROFILE:', process.env.AWS_DEFAULT_PROFILE);
console.log('BUILD_PLATFORM:', process.env.BUILD_PLATFORM);
console.log('OUT_TAG_IMAGE_SHELL_FILE:', process.env.OUT_TAG_IMAGE_SHELL_FILE);

// Validate required environment variables

if (!solutionEcrBuildVersion) {
    console.error('ERROR: BUILD_VERSION environment variable is not set!');
    process.exit(1);
}

if (!solutionEcrAccount) {
    console.error('ERROR: SOLUTION_ECR_ACCOUNT environment variable is not set!');
    process.exit(1);
}

const imagesSet = new Set();
const tagCommands = [
    `#!/usr/bin/env bash`,
    '',
    `set -e`,
    '',
    `region=${awsRegion}`,
    `profile=${awsProfile}`,
    `echo region=$region`,
    `echo profile=$profile`,
    '',
    "echo Using current AWS credentials",
    '',
    `if [[ "$region" == "cn-northwest-1" || "$region" == "cn-north-1" ]]; then
        aws ecr get-login-password --region $region --profile $profile | docker login --username AWS --password-stdin ${solutionEcrAccount}.dkr.ecr.$region.amazonaws.com.cn
    else
        aws ecr get-login-password --region $region --profile $profile | docker login --username AWS --password-stdin ${solutionEcrAccount}.dkr.ecr.$region.amazonaws.com
    fi`,
    '',
];

main();

async function main() {
    const source = path.join(__dirname, '..', 'global-s3-assets');
    const newTagShellFile = path.join(__dirname, '..', outTagImageShellFile);

    infoLog(`solutionEcrAccount: ${solutionEcrAccount}`);
    infoLog(`solutionEcrRepoName: ${solutionEcrRepoName}`);
    infoLog(`source: ${source}`);
    infoLog(`newTagShellFile: ${newTagShellFile}`);
    infoLog(`solutionEcrBuildVersion: ${solutionEcrBuildVersion}`);

    // Check if templates are directly in the source directory
    const directTemplates = fs.readdirSync(source).filter(f => f.endsWith('.template.json') && !f.includes('/cn/'));
    debugLog(`Direct templates found: ${JSON.stringify(directTemplates)}`);
    
    // Process direct templates
    directTemplates.forEach(t => processTemplate(source, t));
    
    // Also check for subdirectories (original logic)
    const directories = fs.readdirSync(source, {
            withFileTypes: true
        })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(d => !d.includes('/cn/'));
    
    debugLog(`Found directories: ${JSON.stringify(directories)}`);
    
    directories.forEach(
            d => {
                const templates = fs.readdirSync(path.join(source, d)).filter(f => f.endsWith('.template.json'));
                debugLog(`Templates in ${d}: ${JSON.stringify(templates)}`);
                templates.forEach(t => processTemplate(path.join(source, d), t));
            }
        );

    tagCommands.push("echo \"=== tag images done ===\"");
    tagCommands.push("");
    fs.writeFileSync(newTagShellFile, tagCommands.join("\n"));
    infoLog("will tag new images: ")
    infoLog(JSON.stringify(Array.from(imagesSet), null, 2));

}

function processTemplate(d, file_name) {
    const template_file = path.join(d, file_name);
    debugLog(`check template ${template_file}`)
    const raw_template = fs.readFileSync(template_file);
    const template = JSON.parse(raw_template);

    updateECRImagesForECSTaskDefinition(template_file, template);
    updateECRImagesForLambda(template_file, template);

    // Output modified template file
    const indent = file_name.includes('reporting-quicksight-stack') ? undefined : 1;
    const output_template = JSON.stringify(template, null, indent);
    const output_template_file = template_file;

    fs.writeFileSync(`${output_template_file}`, output_template);
}

function updateECRImagesForECSTaskDefinition(template_file, template) {
    debugLog(`updateECRImagesForECSTaskDefinition for template_file: ${template_file}`);
    const taskDefs = getResourcesByType(template, 'AWS::ECS::TaskDefinition');

    for (let tDef of taskDefs) {
        const resourceName = tDef.Metadata['aws:cdk:path'].split("/").slice(-2, -1);
        for (let cDef of tDef.Properties.ContainerDefinitions) {
            const oldImage = cDef.Image["Fn::Sub"];
            const cName = cDef.Name;
            const fullName = `${resourceName}-${cName}`;
            const newImage = `${solutionEcrAccount}.dkr.ecr.\${AWS::Region}.\${AWS::URLSuffix}/${solutionEcrRepoName}:${solutionEcrBuildVersion}-${fullName}`;
            addNewTag(oldImage, newImage);

        }
    }

}

function updateECRImagesForLambda(template_file, template) {
    debugLog(`updateECRImagesForLambda for template_file: ${template_file}`);
    const lambdaFns = getResourcesByType(template, 'AWS::Lambda::Function');
    for (let fn of lambdaFns) {
        if (fn.Properties.Code && fn.Properties.Code.ImageUri) {
            const oldImage = fn.Properties.Code.ImageUri["Fn::Sub"];
            // "cloudfront-s3-control-plane-stack-cn/ClickStreamApi/ClickStreamApiFunction/Resource"
            const resourceName = fn.Metadata['aws:cdk:path'].split("/").slice(-2, -1);
            const newImage = `${solutionEcrAccount}.dkr.ecr.\${AWS::Region}.\${AWS::URLSuffix}/${solutionEcrRepoName}:${solutionEcrBuildVersion}-${resourceName}`;
            addNewTag(oldImage, newImage);
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
    if (resources.length > 0) {
        debugLog(`find ${resources.length} ${resourceType}`);
    }
    return resources;
}


function addNewTag(oldImage, newImage) {
    oldImage = (oldImage + '').replace('${AWS::Region}', '$region');
    newImage = (newImage + '').replace('${AWS::Region}', '$region');
    
    if (awsRegion === 'cn-northwest-1' || awsRegion === 'cn-north-1') {
        oldImage = oldImage.replace('${AWS::URLSuffix}', 'amazonaws.com.cn');
        newImage = newImage.replace('${AWS::URLSuffix}', 'amazonaws.com.cn');
    } else {
        oldImage = oldImage.replace('${AWS::URLSuffix}', 'amazonaws.com');
        newImage = newImage.replace('${AWS::URLSuffix}', 'amazonaws.com');
    }

    debugLog(`Processing image: ${oldImage}`);
    debugLog(`Expected account: ${solutionEcrAccount}`);
    debugLog(`Image contains account: ${oldImage.includes(solutionEcrAccount)}`);

    if (!oldImage.includes(solutionEcrAccount)) {
        debugLog("ignore image: " + oldImage)
        return;
    }

    if (imagesSet.has(newImage)) {
        debugLog(`Duplicate image skipped: ${newImage}`);
        return;
    }

    debugLog(`Adding new tag: ${oldImage} -> ${newImage}`);
    imagesSet.add(newImage);

    // Determine Dockerfile path based on image suffix
    let dockerfilePath = '';
    let buildContext = '';
    let exebuildPlatform = buildPlatform;
    if (oldImage.includes('portal_fn')) {
        dockerfilePath = 'src/control-plane/frontend/Dockerfile';
        buildContext = '..';
        exebuildPlatform = 'linux/arm64'; // Use arm64 for frontend
    } else if (oldImage.includes('ecs-task-def-proxy')) {
        dockerfilePath = 'Dockerfile';
        buildContext = '../src/ingestion-server/server/images/nginx';
        exebuildPlatform = buildPlatform;
    } else if (oldImage.includes('ecs-task-def-worker')) {
        dockerfilePath = 'Dockerfile';
        buildContext = '../src/ingestion-server/server/images/vector';
        exebuildPlatform = buildPlatform;
    }

    tagCommands.push(
        `echo "Processing image: ${oldImage}"`,
        `echo "Building from Dockerfile: ${dockerfilePath}"`,
        `docker build -f ${buildContext}/${dockerfilePath} --platform ${exebuildPlatform} --build-arg PLATFORM_ARG=${exebuildPlatform} -t ${newImage} ${buildContext}`,
        `if docker manifest inspect ${oldImage} > /dev/null 2>&1; then`,
        `  echo "Old image exists, tagging fresh build: ${oldImage}"`,
        `  docker pull ${oldImage} --platform ${exebuildPlatform}`,
        `  docker tag ${oldImage} ${newImage}`,
        `fi`,
        `docker push ${newImage} --platform ${exebuildPlatform}`,
        `echo "Successfully pushed: ${newImage}"`,
        "",
    );
}


function debugLog(message) {
    //console.log(message);
}

function infoLog(message) {
    console.log(message);
}
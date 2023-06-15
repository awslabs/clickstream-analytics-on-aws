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
const solutionEcrAccount = process.env.SOLUTION_ECR_ACCOUNT || '366590864501';
const solutionEcrRepoName = process.env.SOLUTION_ECR_REPO_NAME || 'clickstream-analytics-on-aws';
const solutionEcrBuildVersion = process.env.BUILD_VERSION;

const imagesSet = new Set();
const tagCommands = [
    `#!/usr/bin/env bash`,
    '',
    `set -e`,
    '',
    `region=$1`,
    `echo region=$region`,
    '',
    "echo Generate STS token for publish assets",
    "set +x",
    `json_output=$(aws sts assume-role --role-arn "$AWS_ASSET_PUBLISH_ROLE" --role-session-name "publishing-ecr-assets-role" --duration-seconds "3600" 2>&1)`,
    `export AWS_ACCESS_KEY_ID=$(echo "\${json_output}"     | jq -r .Credentials.AccessKeyId)`,
    `export AWS_SECRET_ACCESS_KEY=$(echo "\${json_output}" | jq -r .Credentials.SecretAccessKey)`,
    `export AWS_SESSION_TOKEN=$(echo "\${json_output}"     | jq -r .Credentials.SessionToken)`,
    `set -x`,
    '',
    `aws ecr get-login-password --region $region | docker login --username AWS --password-stdin ${solutionEcrAccount}.dkr.ecr.$region.amazonaws.com`,
    '',
];

main();

async function main() {
    const source = path.join(__dirname, '..', 'global-s3-assets');
    const newTagShellFile = path.join(__dirname, '..', outTagImageShellFile);

    infoLog(`solutionEcrAccount: ${solutionEcrAccount}`);
    infoLog(`solutionEcrRepoName: ${solutionEcrRepoName}`);
    infoLog(`newTagShellFile: ${newTagShellFile}`);
    infoLog(`solutionEcrBuildVersion: ${solutionEcrBuildVersion}`);

    fs.readdirSync(source, {
            withFileTypes: true
        })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(d => !d.includes('/cn/'))
        .forEach(
            d => {
                fs.readdirSync(path.join(source, d)).filter(f => f.endsWith('.template.json'))
                    .forEach(t => processTemplate(path.join(source, d), t));
            }
        );

    tagCommands.push("echo \"=== tag images done ===\"");
    tagCommands.push("unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN");
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
    const output_template = JSON.stringify(template, null, 2);
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
    oldImage = (oldImage + '').replace('${AWS::Region}', '$region').replace('${AWS::URLSuffix}', 'amazonaws.com');
    newImage = (newImage + '').replace('${AWS::Region}', '$region').replace('${AWS::URLSuffix}', 'amazonaws.com');

    if (!oldImage.includes(solutionEcrAccount)) {
        debugLog("ignore image: " + oldImage)
        return;
    }

    if (imagesSet.has(newImage)) {
        return;
    }

    imagesSet.add(newImage);

    tagCommands.push(
        `echo "docker tag ${oldImage} ${newImage}"`,
        `docker pull ${oldImage}`,
        `docker tag  ${oldImage} ${newImage}`,
        `docker push ${newImage}`,
        "",
    );
}


function debugLog(message) {
    //console.log(message);
}

function infoLog(message) {
    console.log(message);
}
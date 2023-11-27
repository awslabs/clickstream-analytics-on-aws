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

async function deleteDirectoryIfExists(directory) {
    try {
        await fs.promises.rmdir(directory, { recursive: true });
        console.log(`${directory} deleted.`);
    } catch (err) {
        if (err.code !== 'ENOENT') { 
            console.error(`Delete ${directory} error : ${err}`);
            throw err;
        }
    }
}

async function copyDirectory(src, dest) {
    try {
        await fs.promises.mkdir(dest, { recursive: true });
        const entries = await fs.promises.readdir(src, { withFileTypes: true });
        
        for (let entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                await fs.promises.copyFile(srcPath, destPath);
            }
        }
    } catch (err) {
        console.error('error:', err);
    }
}

const sourceDir = '../../../../base-lib';
const targetDir = './node_modules/@clickstream/base-lib';

deleteDirectoryIfExists(targetDir)
    .then(() => copyDirectory(sourceDir, targetDir))
    .catch(err => console.error(err));
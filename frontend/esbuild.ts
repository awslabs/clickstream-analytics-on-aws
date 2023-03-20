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

/* eslint-disable @typescript-eslint/no-var-requires */
const esbuild = require('esbuild');
const inlineImage = require('esbuild-plugin-inline-image');
const sassPlugin = require('esbuild-plugin-sass');
const htmlMinifier = require('html-minifier');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

// CONFIG
const PUBLIC_DIR = './public';
const DIST_DIR = './build';
const hash = createHash('md5')
  .update(Date.now().toString())
  .digest('hex')
  .slice(0, 8);

const ESBUILD_CONFIG = {
  entryPoints: ['./src/index.tsx'],
  bundle: true,
  plugins: [
    sassPlugin(), // add sass plugin
    inlineImage(), // add image plugin
  ],
};

function copyFolderSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target);
  }

  fs.readdirSync(source).forEach((file) => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyFolderSync(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

/**
 * esbuild
 */
const build = () => {
  // Check if dist directory exists, if not create it
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdir(DIST_DIR, (err) => {
      if (err) throw err;
      console.log(`${DIST_DIR} created.`);
    });
  } else {
    console.log(`${DIST_DIR} already exists.`);
    fs.rm(DIST_DIR, { recursive: true }, (err) => {
      if (err) throw err;
      console.log('Directory removed!');
    });
  }
  // Build our files
  esbuild
    .build({
      ...ESBUILD_CONFIG,
      sourcemap:
        process.env.GENERATE_SOURCEMAP !== 'false' ? 'external' : false,
      minify: true,
      write: true,
      outfile: `${DIST_DIR}/assets/index.${hash}.js`,
    })
    .then(() => {
      // Copy public to build
      copyFolderSync(`${PUBLIC_DIR}`, `${DIST_DIR}`);

      // Replace js path
      const indexHtmlPath = path.join(`${DIST_DIR}`, 'index.html');
      const indexJsPath = fs
        .readdirSync(`${DIST_DIR}/assets/`)
        .find((file) => file.startsWith('index.') && file.endsWith('.js'));

      const indexCssPath = fs
        .readdirSync(`${DIST_DIR}/assets/`)
        .find((file) => file.startsWith('index.') && file.endsWith('.css'));

      if (!indexJsPath) {
        throw new Error('Cannot find hashed index.js file');
      }

      if (!indexCssPath) {
        throw new Error('Cannot find hashed index.css file');
      }

      const jsHash = indexJsPath.match(/\.([0-9a-f]{8})\.js$/)[1];
      const cssHash = indexCssPath.match(/\.([0-9a-f]{8})\.css$/)[1];

      const indexHtmlContent = fs.readFileSync(indexHtmlPath, {
        encoding: 'utf-8',
      });

      const updatedIndexHtmlContent = indexHtmlContent
        .replace(
          '</head>',
          `<link rel="stylesheet" href="/assets/index.${cssHash}.css">
           </head>`
        )
        .replace(
          '</body>',
          `<script src="/assets/index.${jsHash}.js" defer></script>
           </body>`
        );

      const minifiedHtml = htmlMinifier.minify(updatedIndexHtmlContent, {
        removeComments: true,
        collapseWhitespace: true,
        minifyJS: true,
        minifyCSS: true,
      });

      fs.writeFileSync(indexHtmlPath, minifiedHtml, {
        encoding: 'utf-8',
      });

      console.log('ESBuild successfully！');
    });
};

build();

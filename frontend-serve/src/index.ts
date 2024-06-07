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

import express from 'express';
import serveStatic from 'serve-static';
import path from 'path';

const app: express.Express = express();

const port = process.env.PORT || 3000;

// serve static assets normally
app.use(serveStatic(path.join(__dirname, 'public'), {
    maxAge: '1d',
    index: ['index.html'],
    setHeaders: setCustomCacheControl
  }))

// handle every other route with index.html, which will contain
// a script tag to your application's JavaScript file(s).
app.get('/*', function (_req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
  
function setCustomCacheControl (res: any, path: any) {
    if (serveStatic.mime.lookup(path) === 'text/html') {
      // Custom Cache-Control for HTML files
      res.setHeader('Cache-Control', 'public, max-age=0')
    }
  }

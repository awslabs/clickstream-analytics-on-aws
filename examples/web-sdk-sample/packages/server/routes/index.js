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
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send({ message: 'I am alive' }).status(200);
});

// Simulate 200 route
router.get('/product/all', async (req, res) => {
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
  res
    .send({
      data: [
        { id: '1001', name: 'Test Product', price: '100' },
        { id: '1002', name: 'Product Sample', price: '200' },
      ],
    })
    .status(200);
});

// Simulate 400 route
router.get('/product/search', (req, res) => {
  res.status(400).send({ error: 'Bad Request' });
});

// Simulate 500 route
router.post('/product/add', (req, res) => {
  res.status(500).send({ error: 'Internal Server Error' });
});

module.exports = router;

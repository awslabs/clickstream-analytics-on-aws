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
import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'http-request',
      component: () => import('./components/HttpRequest'),
    },
    {
      path: '/runtime-error',
      name: 'runtime-error',
      component: () => import('./components/RuntimeError'),
    },
    {
      path: '/performance',
      name: 'performance',
      component: () => import('./components/Performance'),
    },
    {
      path: '/websocket',
      name: 'websocket',
      component: () => import('./components/Websocket'),
    },
    {
      path: '/upload-file',
      name: 'upload-file',
      component: () => import('./components/UploadFile'),
    },
  ],
});

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
import App from './App.vue';
import router from './router';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { ClickstreamAnalytics } from '@aws/clickstream-web';
import { Message } from 'element-ui';

// Initialize Clickstream Analytics SDK
ClickstreamAnalytics.init({
  // isLogEvents: true, // Print events to console
  appId: process.env.VUE_APP_CLICKSTREAM_APP_ID, // Your application ID
  endpoint: process.env.VUE_APP_CLICKSTREAM_ENDPOINT, // Your server endpoint
});

Vue.config.productionTip = false;

// Send vue Runtime Error
Vue.config.errorHandler = function (err, vm, info) {
  // Handle error
  // `err` Error Object
  // `vm` Error Vue Instance
  // `info` is Vue specific error information, such as the life cycle hook where the error occurs
  console.log(`Captured in Vue errorHandler: ${err}, VM: ${vm} Info: ${info}`);
  Message({
    message: err,
    type: 'error',
    duration: 3 * 1000,
  });
  ClickstreamAnalytics.record({
    name: 'runtime_exception',
    attributes: {
      error_message: err.toString(),
      vm: vm.toString(),
      info: info,
    },
  });
};

Vue.use(ElementUI);

function sendPerformanceData() {
  const tmpPerf = {
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
    totalJSHeapSize: performance.memory.jsHeapSizeLimit,
    usedJSHeapSize: performance.memory.usedJSHeapSize,
  };
  console.info('performance.memory:', tmpPerf);
  ClickstreamAnalytics.record({
    name: 'app_performance',
    attributes: { ...tmpPerf, ...performance.getEntriesByType('navigation') },
  });
}

// Send performance data regularly
setInterval(() => {
  sendPerformanceData();
}, 60000);

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app');

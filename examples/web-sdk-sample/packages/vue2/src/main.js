import Vue from 'vue';
import App from './App.vue';
import router from './router';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import { ClickstreamAnalytics } from '@aws/clickstream-web';
import { Message } from 'element-ui';

// 初始化 Clickstream Analytics SDK
ClickstreamAnalytics.init({
  // isLogEvents: true, // 是否打印日志
  appId: process.env.VUE_APP_CLICKSTREAM_APP_ID, // Your application ID
  endpoint: process.env.VUE_APP_CLICKSTREAM_ENDPOINT, // Your server endpoint
});

Vue.config.productionTip = false;

// 发送 vue 运行时错误信息
Vue.config.errorHandler = function (err, vm, info) {
  // 处理错误
  // `err` 是错误对象
  // `vm` 是出错的 Vue 实例
  // `info` 是 Vue 特定的错误信息，比如错误所在的生命周期钩子
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

// 定时发送 performance 数据
setInterval(() => {
  sendPerformanceData();
}, 60000);

new Vue({
  router,
  render: (h) => h(App),
}).$mount('#app');

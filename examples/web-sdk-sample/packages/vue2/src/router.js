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
  ],
});

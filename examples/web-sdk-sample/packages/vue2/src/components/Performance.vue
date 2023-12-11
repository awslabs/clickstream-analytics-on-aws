<template>
  <div class="list row">
    <div class="col-md-12">
      <h4>Performance API</h4>
      <h5>Memory</h5>
      <div class="json-view">
        <pre>{{ JSON.stringify(performanceInfo, null, 2) }}</pre>
      </div>
      <h5>Navigation</h5>
      <div class="json-view">
        <pre>{{ JSON.stringify(navigationInfo, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'runtime-error',
  data() {
    return {
      performanceInfo: {},
      navigationInfo: {},
    };
  },
  methods: {
    showPerformance() {
      const tmpPerf = {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.jsHeapSizeLimit,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
      };
      this.performanceInfo = tmpPerf;
      this.navigationInfo = performance.getEntriesByType('navigation');
    },
  },
  mounted() {
    window.setInterval(() => {
      this.showPerformance();
    }, 1000);
  },
};
</script>

<style scoped>
.list {
  text-align: left;
  max-width: 750px;
  margin: auto;
}
.json-view {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>

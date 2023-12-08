<template>
  <div class="list row">
    <div class="col-md-12">
      <h4>运行时错误</h4>
      <button class="m-3 btn btn-sm btn-danger" @click="simulateCrash">
        未定义的方法
      </button>
      <button class="m-3 btn btn-sm btn-danger" @click="undefinedProperty">
        读取Undefined对象的属性
      </button>
      <button class="m-3 btn btn-sm btn-warning" @click="unsupportedZero">
        1/0
      </button>
      <button class="btn btn-sm">{{ result }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'runtime-error',
  data() {
    return {
      result: 10,
    };
  },
  methods: {
    unsupportedZero() {
      // 除数为0
      this.result = 1 / 0;
    },
    simulateCrash() {
      // 故意制造一个错误
      this.undefinedFunction();
    },
    undefinedProperty() {
      // 故意制造一个错误
      this.title = this.abc.undefinedProperty;
    },
  },
  mounted() {},
};
</script>

<style scoped>
.list {
  text-align: left;
  max-width: 750px;
  margin: auto;
}
</style>

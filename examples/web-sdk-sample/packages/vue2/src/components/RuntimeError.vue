<template>
  <div class="list row">
    <div class="col-md-12">
      <h4>Runtime Error</h4>
      <button class="m-3 btn btn-sm btn-danger" @click="simulateCrash">
        Undefined Function
      </button>
      <button class="m-3 btn btn-sm btn-danger" @click="undefinedProperty">
        Read the properties of an Undefined object
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
      // Divisor is 0
      this.result = 1 / 0;
    },
    simulateCrash() {
      // Deliberately create an error
      this.undefinedFunction();
    },
    undefinedProperty() {
      // Deliberately create an error
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

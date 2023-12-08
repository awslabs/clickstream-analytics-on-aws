<template>
  <div class="list row">
    <div class="col-md-12">
      <div class="flex-container">
        <input
          type="text"
          class="form-control"
          placeholder="Search by title"
          v-model="keyword"
        />
        <button class="btn btn-secondary" type="button" @click="searchTitle">
          搜索
        </button>
      </div>
    </div>
    <div class="col-md-12">
      <el-table :data="productList" style="width: 100%">
        <el-table-column prop="id" label="ID"> </el-table-column>
        <el-table-column prop="name" label="名称"> </el-table-column>
        <el-table-column prop="price" label="价格"> </el-table-column>
        <el-table-column label="操作" width="100">
          <template>
            <el-button type="text" size="small" @click="editProduct"
              >编辑</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="col-md-6 mt-10">
      <button class="btn btn-success" type="button" @click="getProductList">
        刷新
      </button>
      <button class="btn btn-danger ml-10" type="button" @click="addProduct">
        添加
      </button>
    </div>
  </div>
</template>

<script>
import ProductService from '../services/product-service';

export default {
  name: 'http-request',
  data() {
    return {
      keyword: '',
      loadingData: false,
      productList: [],
    };
  },
  methods: {
    getProductList() {
      this.productList = [];
      ProductService.getAll()
        .then((response) => {
          console.log(response);
          this.productList = response.data;
        })
        .catch((e) => {
          console.log(e);
        });
    },
    searchTitle() {
      ProductService.findByTitle(this.title)
        .then((response) => {
          console.log(response);
        })
        .catch((e) => {
          console.log(e);
        });
    },
    addProduct() {
      ProductService.addProduct(this.title)
        .then((response) => {
          console.log(response);
        })
        .catch((e) => {
          console.log(e);
        });
    },
    editProduct() {
      ProductService.editProduct(this.title)
        .then((response) => {
          console.log(response);
        })
        .catch((e) => {
          console.log(e);
        });
    },
  },
  mounted() {
    this.getProductList();
  },
};
</script>

<style scoped>
.ml-10 {
  margin-left: 10px;
}
.mt-10 {
  margin-top: 10px;
}
.flex-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
input {
  flex: 1;
}
.list {
  text-align: left;
  max-width: 750px;
  margin: auto;
}
</style>

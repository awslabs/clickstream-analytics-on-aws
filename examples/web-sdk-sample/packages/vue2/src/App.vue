<template>
  <div id="app">
    <nav class="navbar navbar-expand navbar-dark bg-dark">
      <router-link to="/" class="navbar-brand"
        ><span class="m-10">ClickStream Web SDK</span></router-link
      >
      <div class="navbar-nav mr-auto">
        <span class="nav-item">
          <router-link
            to="/"
            class="nav-link"
            :class="{ 'active-link': isActive('/') }"
            >HTTP Request</router-link
          >
        </span>
        <span class="nav-item">
          <router-link
            to="/runtime-error"
            class="nav-link"
            :class="{ 'active-link': isActive('/runtime-error') }"
            >Vue Runtime Error</router-link
          >
        </span>
        <span class="nav-item">
          <router-link
            to="/performance"
            class="nav-link"
            :class="{ 'active-link': isActive('/performance') }"
            >Performance API</router-link
          >
        </span>
        <span class="nav-item">
          <router-link
            to="/websocket"
            class="nav-link"
            :class="{ 'active-link': isActive('/websocket') }"
            >Websocket</router-link
          >
        </span>
        <span class="nav-item">
          <router-link
            to="/upload-file"
            class="nav-link"
            :class="{ 'active-link': isActive('/upload-file') }"
            >UploadFile</router-link
          >
        </span>
      </div>
    </nav>
    <div class="container mt-3">
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  name: 'app',
  methods: {
    isActive(routePath) {
      return this.$route.path === routePath;
    },
  },
};
</script>

<style>
.active-link {
  font-weight: bold;
  color: #fff;
}
</style>

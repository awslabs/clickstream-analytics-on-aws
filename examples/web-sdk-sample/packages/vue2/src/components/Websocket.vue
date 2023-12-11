<template>
  <div class="list row">
    <div class="col-md-12">
      <h4>Websocket</h4>
      <h5>Server time: {{ serverTime }}</h5>
      <h5>Message From Server</h5>
      <div class="json-view">
        <ul>
          <li v-for="msg in serverMessages" :key="msg">{{ msg }}</li>
        </ul>
      </div>
      <h5>Send Message To Server</h5>
      <div class="flex-container">
        <input
          class="form-control"
          placeholder="your message"
          v-model="message"
          @keyup.enter="sendMessage"
        />
        <button class="btn btn-sm btn-success" @click="sendMessage">
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import SocketioService from '../utils/socketio';
import { ClickstreamAnalytics } from '@aws/clickstream-web';

export default {
  name: 'websocket',
  data() {
    return {
      socket: null,
      serverTime: '',
      serverMessages: [],
      message: '',
    };
  },
  methods: {
    sendMessage() {
      if (this.message.trim() !== '') {
        SocketioService.sendMessage(this.message);
        this.message = '';
      }
    },
  },
  mounted() {
    this.socket.on('server time', (data) => {
      // Record the time of server push
      ClickstreamAnalytics.record({
        name: 'server_time',
        attributes: { message: data },
      });
      this.serverTime = data;
    });
    this.socket.on('client message', (data) => {
      this.serverMessages.push(data);
    });
  },
  beforeUnmount() {
    SocketioService.disconnect();
  },
  created() {
    this.socket = SocketioService.setupSocketConnection();
  },
};
</script>

<style scoped>
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
.json-view {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
</style>

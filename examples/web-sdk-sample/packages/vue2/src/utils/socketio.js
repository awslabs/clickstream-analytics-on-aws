import { io } from 'socket.io-client';
import { ClickstreamAnalytics } from '@aws/clickstream-web';

class SocketioService {
  socket;
  constructor() {}
  setupSocketConnection() {
    this.socket = io(process.env.VUE_APP_SERVER_API);
    this.socket.emit('my message', 'Hello there from Vue.');

    // 监听连接成功事件
    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server.');
    });

    // 监听断开连接事件
    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
    });

    // 监听连接错误事件
    this.socket.on('connect_error', (error) => {
      console.log('Connection error:', error);
    });

    // 监听连接超时事件
    this.socket.on('connect_timeout', (timeout) => {
      console.log('Connection timeout:', timeout);
    });

    this.socket.on('server time', (data) => {
      // console.log('Server time:', data);
    });
    return this.socket;
  }

  sendMessage(msg) {
    ClickstreamAnalytics.record({
      name: 'send_websocket',
      attributes: { message: msg },
    });
    this.socket.emit('client message', msg);
  }
}

export default new SocketioService();

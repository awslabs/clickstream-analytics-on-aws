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
      ClickstreamAnalytics.record({
        name: 'websocket_disconnect',
        attributes: { message: reason },
      });
      console.log('Disconnected from WebSocket server:', reason);
    });

    // 监听连接错误事件
    this.socket.on('connect_error', (error) => {
      ClickstreamAnalytics.record({
        name: 'websocket_connect_error',
        attributes: { message: error },
      });
      console.log('Connection error:', error);
    });

    // 监听连接超时事件
    this.socket.on('connect_timeout', (timeout) => {
      ClickstreamAnalytics.record({
        name: 'websocket_connect_timeout',
        attributes: { message: timeout },
      });
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

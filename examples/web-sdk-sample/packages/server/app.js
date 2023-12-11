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
const app = require('express')();
const cors = require('cors');
const server = require('http').createServer(app);
const index = require('./routes/index');
app.use(cors());
app.use(index);
const io = require('socket.io')(server, {
  cors: {
    origins: ['*'],
  },
});
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('client message', (msg) => {
    io.emit('client message', `${msg}`);
  });
});

setInterval(() => {
  io.emit('server time', new Date().toTimeString());
}, 1000);

server.listen(4001, () => {
  console.log('Listening on *:4001');
});

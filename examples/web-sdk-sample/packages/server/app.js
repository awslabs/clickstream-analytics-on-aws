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

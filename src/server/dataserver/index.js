const net = require('net');
const { port } = require('./config');

function createServer(logger = console) {
  const server = net.createServer((socket) => {
    logger.log('event', `client connected to dataserver: ${socket.remoteAddress}`);

    socket.on('data', (data) => {
      logger.log(data.toString());
    });

    socket.on('error', (err) => {
      logger.log('alarm', `dataclient error: ${err.message}`);
    });

    socket.on('close', () => {
      logger.log('event', `dataclient closed connection: ${socket.remoteAddress}`);
    });
  });

  server.on('listening', () => {
    logger.log('event', `dataserver listening on port ${port}`);
  });

  server.on('error', (err) => {
    logger.log('alarm', `dataserver error: ${err.message}`);
    server.close();
    setTimeout(() => server.listen(port), 1000);
  });

  server.listen(port);

  return server;
}

module.exports = {
  createServer,
};

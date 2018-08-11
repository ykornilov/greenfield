const fs = require('fs');
const path = require('path');
const net = require('net');
const { clientAccessPolicyFile, port } = require('./config');

const pathName = path.join(__dirname, clientAccessPolicyFile);
const policy = fs.readFileSync(pathName, 'utf-8');

function createServer(logger = console) {
  const server = net.createServer((socket) => {
    logger.log('event', `client connected to silverlightserver: ${socket.remoteAddress}`);

    socket.on('data', (data) => {
      if (data.toString().trim() === '<policy-file-request/>') {
        socket.write(policy);
      }
      socket.end();
    });

    socket.on('error', (err) => {
      logger.log('event', `silverlightclient error: ${err.message}`);
    });

    socket.on('close', () => {
      logger.log('event', `silverlighclient closed connection: ${socket.remoteAddress}`);
    });
  });

  server.on('listening', () => {
    logger.log('event', `silverlightserver listening on port ${port}`);
  });

  server.on('error', (err) => {
    logger.log('event', `silverlightserver error: ${err.message}`);
    server.close();
    setTimeout(() => server.listen(port), 1000);
  });

  server.listen(port);

  return server;
}

module.exports = {
  createServer,
};

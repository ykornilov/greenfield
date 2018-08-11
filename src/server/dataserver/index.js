const net = require('net');
const events = require('events');
const { port } = require('./config');

class DataServer extends events.EventEmitter {
  costructor(logger = console) {
    super();
    this.logger = logger;
    this.server = null;
    this.clients = [];
  }

  start() {
    this.server = net.createServer((socket) => {
      this.logger.log('event', `client connected to dataserver: ${socket.remoteAddress}`);
      this.clients.push(socket);

      socket.on('data', (data) => {
        this.emit('data', data);
      });

      socket.on('error', (err) => {
        this.logger.log('event', `dataclient error: ${err.message}`);
        this.destroyClient(socket);
      });

      socket.on('close', () => {
        this.logger.log('event', `dataclient closed connection: ${socket.remoteAddress}`);
        this.destroyClient(socket);
      });
    });

    this.server.on('listening', () => {
      this.logger.log('event', `dataserver listening on port ${port}`);
    });

    this.server.on('error', (err) => {
      this.logger.log('event', `dataserver error: ${err.message}`);
      this.restart(1000);
    });

    this.server.listen(port);
  }

  destroyClient(socket) {
    this.clients = this.clients.filter(client => client !== socket);
    socket.destroy();
  }

  send(data) {
    this.clients.forEach(client => client.write(data, 'utf-8', (err) => {
      if (err) {
        this.logger.log('event', `dataclient send error: ${err.message}`);
        this.destroyClient(client);
      }
    }));
  }

  restart(timeout) {
    this.stop();
    setTimeout(() => this.server.listen(port), timeout);
  }

  stop() {
    this.clients.forEach(client => client.end());
    this.clients = [];
    this.server.removeAllListeners();
    this.server.close();
    this.logger.log('event', 'server is stopped');
  }
}

// function createServer(logger = console) {
//   const server = net.createServer((socket) => {
//     logger.log('event', `client connected to dataserver: ${socket.remoteAddress}`);

//     socket.on('data', (data) => {
//       logger.log(data.toString());
//     });

//     socket.on('error', (err) => {
//       logger.log('event', `dataclient error: ${err.message}`);
//     });

//     socket.on('close', () => {
//       logger.log('event', `dataclient closed connection: ${socket.remoteAddress}`);
//     });
//   });

//   server.on('listening', () => {
//     logger.log('event', `dataserver listening on port ${port}`);
//   });

//   server.on('error', (err) => {
//     logger.log('event', `dataserver error: ${err.message}`);
//     server.close();
//     setTimeout(() => server.listen(port), 1000);
//   });

//   server.listen(port);

//   return server;
// }

module.exports = {
  DataServer,
};

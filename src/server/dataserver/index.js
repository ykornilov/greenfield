const net = require('net');
const events = require('events');
const { port, AMX } = require('./config');

class DataServer extends events.EventEmitter {
  constructor(logger = console) {
    super();
    this.logger = logger;
    this.server = null;
    this.clients = [];
    this.lastId = 0;
  }

  getId() {
    this.lastId += 1;
    return this.lastId;
  }

  start() {
    this.server = net.createServer((socket) => {
      socket.setEncoding('utf-8');
      /* eslint no-param-reassign: ["error", {
          "props": true,
          "ignorePropertyModificationsFor": ["socket"]
        }] */
      socket.id = this.getId();
      this.logger.log('event', `client [${socket.id}] connected to dataserver: ${socket.remoteAddress}`);
      this.clients.push(socket);
      if (!socket.remoteAddress.includes(AMX)) {
        this.emit('data', {
          id: socket.id,
          payload: '%getAll;',
        });
      }

      socket.on('data', (data) => {
        this.emit('data', {
          id: socket.id,
          payload: data,
        });
      });

      socket.on('error', (err) => {
        this.logger.log('event', `client [${socket.id}] error: ${err.message}`);
        this.destroyClient(socket);
      });

      socket.on('close', () => {
        this.logger.log('event', `client [${socket.id}] closed connection`);
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
    this.clients.forEach((client) => {
      if (data.id && data.id !== client.id) {
        return;
      }
      client.write(data.payload, (err) => {
        if (err) {
          this.logger.log('event', `client send error: ${err.message}`);
          this.destroyClient(client);
        }
      });
    });
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
    this.logger.log('event', 'dataserver is stopped');
  }
}

module.exports = {
  DataServer,
};

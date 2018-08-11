class Dispatcher {
  constructor(beckhoff, dataserver, logger = console) {
    this.logger = logger;
    this.beckhoff = beckhoff;
    this.dataserver = dataserver;

    this.beckhoff.on('data', data => this.logger.log(data));
    this.dataserver.on('data', data => this.logger.log(data));
  }

  start() {
    this.beckhoff.connect();
    this.dataserver.start();
  }
}

module.exports = {
  Dispatcher,
};

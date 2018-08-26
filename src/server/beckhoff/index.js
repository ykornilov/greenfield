const events = require('events');
const config = require('./config');
const { AdsClient } = require('./adsclient');

class BeckhoffClient extends events.EventEmitter {
  constructor(logger = console) {
    super();

    this.controllers = config.controllers
      .map(controller => (
        {
          ...controller,
          amsNetIdSource: config.amsNetIdSource,
          amsPortSource: config.amsPortSource,
        }
      ))
      .reduce((adsClients, controllerConfig) => (
        {
          ...adsClients,
          [controllerConfig.amsNetIdTarget]: new AdsClient(controllerConfig, logger),
        }
      ), {});

    Object.values(this.controllers).forEach(controller => controller.on('data', data => this.emit('data', data)));
    process.on('exit', () => this.disconnect());
  }

  connect() {
    Object.values(this.controllers).forEach(controller => controller.connect());
  }

  write(valueId, value) {
    const controller = config.controllers
      .find(ctrl => ctrl.datapoints.some(dp => dp.id === valueId));
    if (controller) {
      this.controllers[controller.amsNetIdTarget].write(valueId, value);
    }
  }

  getAll(id) {
    Object.values(this.controllers).forEach(controller => controller.getAll(id));
  }

  disconnect() {
    Object.values(this.controllers).forEach(controller => controller.disconnect());
  }
}

module.exports = {
  BeckhoffClient,
};

const events = require('events');
const config = require('./config');
const { AdsClient } = require('./adsclient');

class BeckhoffClient extends events.EventEmitter {
  constructor(options, logger = console) {
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

    this.controllers.forEach(controller => controller.on('data', data => this.emit('data', data)));
  }

  connect() {
    this.controllers.forEach(controller => controller.connect());
  }

  disconnect() {
    this.controllers.forEach(controller => controller.disconnect());
  }

  write(valueId, value) {
    const controller = config.controllers
      .find(ctrl => ctrl.datapoints.some(dp => dp.id === valueId));
    if (controller) {
      this.controllers[controller.amsNetIdTarget].write(valueId, value);
    }
  }
}

module.exports = {
  BeckhoffClient,
};

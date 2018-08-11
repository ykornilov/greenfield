const events = require('events');
const ads = require('node-ads');

class AdsClient extends events.EventEmitter {
  constructor(options, logger = console) {
    super();
    this.logger = logger;
    this.client = null;
    this.options = {
      host: options.host,
      amsNetIdSource: options.amsNetIdSource,
      amsNetIdTarget: options.amsNetIdTarget,
    };
    this.handlers = options.datapoints.map(dp => (
      {
        id: dp.id,
        symname: dp.name,
        bytelength: ads[dp.type],
        access: dp.access,
      }
    ));
  }

  connect() {
    this.client = ads.connect(this.options, () => {
      this.handlers.array.forEach(handler => this.notify(handler));
      this.logger.log('event', `Controller connected [${this}];`);
    });

    this.client.on('notification', (handle) => {
      this.logger.log('data', `${handle.symname} = ${handle.value};`);
      this.emit('data', `%${handle.id}=${handle.value};`);
    });
  }

  write(valueId, value) {
    const handler = this.handlers.find(dp => dp.id === valueId);
    if (handler && handler.access === 'write') {
      handler.value = value;
      this.client.write(handler, (errWriting) => {
        if (errWriting) {
          this.logger.log('event', `error write value for ${this.options.amsNetIdTarget}:${handler.symname} - ${errWriting.message}`);
          return false;
        }
        this.client.read(handler, (errReading, handle) => {
          if (errReading) {
            this.logger.log('event', `error read value for ${this.options.amsNetIdTarget}:${handler.symname} - ${errReading.message}`);
            return false;
          }
          this.logger.log('data', `${handle.symname} = ${handle.value};`);
          this.emit('data', `%${handle.id}=${handle.value};`);
          return true;
        });
        return true;
      });
    }
  }

  disconnect() {
    this.client.end(() => this.logger.log('event', `Controller disconnected [${this}];`));
  }
}

module.exports = {
  AdsClient,
};

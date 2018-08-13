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
      minReceiveTime: options.minReceiveTime || 0,
    };
    this.handles = options.datapoints.map(dp => (
      {
        ...dp,
        symname: dp.name,
        bytelength: ads[dp.type],
        oldValue: 0,
      }
    ));
    this.handleIndex = 0;
    this.ready = false;
    this.watchTimer = null;
  }

  connect() {
    this.client = ads.connect(this.options, () => {
      this.client.readDeviceInfo((err, result) => {
        if (err) {
          this.logger.log('event', `Controller connect error: ${err.message}`);
        }
        this.logger.log('event', `Connected to controller [${this.options.amsNetIdTarget}]: ${JSON.stringify(result)}`);
        // this.handles.forEach(handle => this.client.notify(handle));
        this.notify();
        this.watch();
      });
    });

    this.client.on('notification', (handle) => {
      if (handle.debounce) {
        if (Math.abs(handle.value - handle.oldValue) / 100 >= handle.debounce) {
          handle.oldValue = handle.value;
          this.logger.log('data', `${handle.symname} = ${handle.value};`);
          this.emit('data', `%${handle.id}=${handle.value};`);
        }
      } else {
        this.logger.log('data', `${handle.symname} = ${handle.value};`);
        this.emit('data', `%${handle.id}=${handle.value};`);
      }
      clearTimeout(this.watchTimer);
      this.watch();
    });
  }

  notify() {
    if (this.handleIndex < this.handles.length) {
      this.client.notify(this.handles[this.handleIndex]);
      setTimeout(() => this.notify(), 50);
      this.handleIndex += 1;
    } else {
      this.ready = true;
      this.logger.log('event', `all notifications for controller ${this.options.amsNetIdTarget} is connected`);
    }
  }

  watch() {
    if (this.options.minReceiveTime) {
      this.watchTimer = setTimeout(() => {
        this.logger.log('event', `watchTimer for controller ${this.options.amsNetIdSource}`);
        this.restart();
      }, this.options.minReceiveTime);
    }
  }

  getAll() {
    this.handles.forEach(handle => this.emit('data', `%${handle.id}=${handle.value};`));
  }

  write(valueId, value) {
    const handle = this.handles.find(dp => dp.id === valueId);
    if (this.ready && handle && handle.access === 'write') {
      handle.value = Number(value.replace(',', '.'));
      this.client.write(handle, (errWriting) => {
        if (errWriting) {
          this.logger.log('event', `error write value for ${this.options.amsNetIdTarget}:${handle.symname} - ${errWriting.message}`);
        }
      });
    }
  }

  restart() {
    this.disconnect();
    setTimeout(() => this.connect(), 10000);
  }

  disconnect() {
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
    }
    this.client.removeAllListeners();
    this.client.end(() => this.logger.log('event', `Controller disconnected [${this.options.amsNetIdTarget}];`));
    this.handleIndex = 0;
    this.ready = false;
  }
}

module.exports = {
  AdsClient,
};

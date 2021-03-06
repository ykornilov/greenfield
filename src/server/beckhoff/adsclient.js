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
      datapoints: options.datapoints,
    };
    this.handles = null;
    this.handleIndex = 0;
    this.ready = false;
    this.disconnecting = false;
    this.watchTimer = null;
    this.baseRestartTimeout = 10000;
    this.numberOfRestart = 0;
  }

  getHandles() {
    this.handles = this.options.datapoints.map(dp => (
      {
        ...dp,
        symname: dp.name,
        bytelength: ads[dp.type],
        oldValue: 0,
      }
    ));
  }

  errorHandler(typeError, err = '') {
    this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] ${typeError}: ${err.message || err}`);
    this.restart();
  }

  setErrorHandler(typeError) {
    this.client.on(typeError, err => this.errorHandler(typeError, err));
  }

  setNotificationHandler() {
    this.client.on('notification', (handle) => {
      if (handle.symname !== 'HeartBeat.puls'
        && (!handle.debounce
          || (handle.debounce
            && Math.abs(handle.value - handle.oldValue) / 100 >= handle.debounce))) {
        /* eslint no-param-reassign: ["error", {
          "props": true,
          "ignorePropertyModificationsFor": ["handle"]
        }] */
        handle.oldValue = handle.value;
        this.logger.log('data', `Controller [${this.options.amsNetIdTarget}]: ${handle.symname} = ${handle.value}`);
        this.emit('data', {
          id: null,
          payload: `%${handle.id}=${handle.value};`,
        });
      }
      if (this.watchTimer) {
        this.numberOfRestart = 0;
        clearTimeout(this.watchTimer);
        this.watch();
      }
    });
  }

  readDeviceInfo() {
    this.client.readDeviceInfo((err, result) => {
      if (err) {
        this.errorHandler('connect error', err);
        return;
      }
      this.logger.log('event', `Connected to controller [${this.options.amsNetIdTarget}]: ${JSON.stringify(result)}`);
    });
  }

  connect() {
    this.client = ads.connect(this.options, () => {
      this.getHandles();
      this.readDeviceInfo();
      this.addNotifications(() => this.watch());
    });
    this.setErrorHandler('error');
    this.setErrorHandler('timeout');
    this.setNotificationHandler();
  }

  addNotifications(cb) {
    if (this.handleIndex < this.handles.length) {
      this.addNotification(this.handles[this.handleIndex], () => this.addNotifications(cb));
    } else {
      this.ready = true;
      if (cb && typeof cb === 'function') {
        cb();
      }
    }
  }

  addNotification(handle, cb) {
    this.client.notify(this.handles[this.handleIndex], () => {
      this.handleIndex += 1;
      cb();
    });
  }

  watch() {
    if (this.options.minReceiveTime) {
      this.watchTimer = setTimeout(() => {
        this.errorHandler('watchTimer error', { message: 'timeout' });
      }, this.options.minReceiveTime * 2);
    }
  }

  getAll(id) {
    if (!this.ready) {
      return;
    }
    this.handles.forEach(handle => this.emit('data', {
      id,
      payload: `%${handle.id}=${handle.value};`,
    }));
  }

  write(valueId, value) {
    if (!this.ready) {
      return;
    }
    const handle = this.handles.find(dp => dp.id === valueId);
    if (handle && handle.access === 'write') {
      try {
        handle.value = Number(value.replace(',', '.'));
        this.client.write(handle, (errWriting) => {
          if (errWriting) {
            this.errorHandler('error write', { message: `${handle.symname} - ${errWriting.message}` });
          }
        });
      } catch (e) {
        this.logger.log('event', `Parsing error ${valueId} = ${value}`);
      }
    }
  }

  restart() {
    this.disconnect(true);
  }

  disconnectHandler(restart) {
    this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] disconnected`);
    this.client.removeAllListeners();
    this.disconnecting = false;
    this.handles = null;
    this.handleIndex = 0;
    if (restart) {
      this.numberOfRestart += 1;
      if (this.numberOfRestart === 20) {
        throw new Error(`Can't connect to controller ${this.options.amsNetIdTarget}`);
      }
      setTimeout(() => this.connect(), this.numberOfRestart * this.baseRestartTimeout);
    }
  }

  disconnect(restart) {
    if (this.disconnecting) {
      return;
    }
    this.disconnecting = true;
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
    }
    this.ready = false;
    this.client.end(() => this.disconnectHandler(restart));
  }
}

module.exports = {
  AdsClient,
};

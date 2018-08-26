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
    this.disconnecting = false;
    this.watchTimer = null;
  }

  connect() {
    this.client = ads.connect(this.options, () => {
      this.client.readDeviceInfo((err, result) => {
        if (err) {
          this.logger.log('event', `Controller connect error: ${err.message}`);
          this.restart();
          return;
        }
        this.logger.log('event', `Connected to controller [${this.options.amsNetIdTarget}]: ${JSON.stringify(result)}`);
        this.addNotifications(() => this.watch());
      });
    });

    this.client.on('error', (err) => {
      this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] error: ${err}`);
      this.restart();
    });

    this.client.on('timeout', (err) => {
      this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] timeout: ${err}`);
      this.restart();
    });

    this.client.on('notification', (handle) => {
      if (!handle.debounce
        || (handle.debounce && Math.abs(handle.value - handle.oldValue) / 100 >= handle.debounce)) {
        /* eslint no-param-reassign: ["error", {
          "props": true,
          "ignorePropertyModificationsFor": ["handle"]
        }] */
        handle.oldValue = handle.value;
        this.logger.log('data', `${handle.symname} = ${handle.value}`);
        this.emit('data', {
          id: null,
          payload: `%${handle.id}=${handle.value};`,
        });
      }
      if (this.watchTimer) {
        clearTimeout(this.watchTimer);
        this.watch();
      }
    });
  }

  addNotifications(cb) {
    if (this.handleIndex < this.handles.length) {
      this.addNotification(this.handles[this.handleIndex], () => this.addNotifications(cb));
    } else if (cb && typeof cb === 'function') {
      cb();
    }
  }

  addNotification(handle, cb) {
    try {
      this.client.notify(this.handles[this.handleIndex], () => {
        this.handleIndex += 1;
        cb();
      });
    } catch (e) {
      this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] addNotification error: ${e.name} / ${e.message} \n ${e.stack}`);
      this.restart();
    }
  }

  watch() {
    if (this.options.minReceiveTime) {
      this.watchTimer = setTimeout(() => {
        this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] watchTimer error`);
        this.restart();
      }, this.options.minReceiveTime);
    }
  }

  getAll(id) {
    this.handles.forEach(handle => this.emit('data', {
      id,
      payload: `%${handle.id}=${handle.value};`,
    }));
  }

  write(valueId, value) {
    const handle = this.handles.find(dp => dp.id === valueId);
    if (this.ready && handle && handle.access === 'write') {
      try {
        handle.value = Number(value.replace(',', '.'));
        this.client.write(handle, (errWriting) => {
          if (errWriting) {
            this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] error write: ${handle.symname} - ${errWriting.message}`);
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

  disconnect(restart) {
    if (this.disconnecting) {
      return;
    }
    this.disconnecting = true;
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
    }
    this.handleIndex = 0;
    this.ready = false;
    this.client.end(() => {
      this.logger.log('event', `Controller [${this.options.amsNetIdTarget}] disconnected`);
      this.client.removeAllListeners();
      this.disconnecting = false;
      if (restart) {
        setTimeout(() => this.connect(), 10000);
      }
    });
  }
}

module.exports = {
  AdsClient,
};

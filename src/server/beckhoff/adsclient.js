const events = require('events');
const ads = require('node-ads');

class AdsClient extends events.EventEmitter {
  constructor(options, logger = console) {
    super();
    this.client = null;
  }

  connect() {
    this.client = ads.connect(options.controller, functon() {
      
    });

    this.client.on('notification', function(handle) {
      logger.log('data', `${handle.symname} = ${handle.value};`)
      this.emit('data', `%${handle.name}=${handle.value};`);
    })
  }

  write(name, value) {
    
  }

  end() {
    this.client.end(function() {
      logger.log('event', `Controller disconnected [${this}];`);
    });
  }
}

module.exports = {
  AdsClient,
};

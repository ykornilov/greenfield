class Dispatcher {
  constructor(beckhoff, dataserver, logger = console) {
    this.logger = logger;
    this.beckhoff = beckhoff;
    this.dataserver = dataserver;

    this.beckhoff.on('data', (data) => {
      this.dataserver.send(data);
    });

    this.dataserver.on('data', (data) => {
      const re = {
        log: /^log_/,
        start: /^%/,
        end: /;$/,
      };

      const cmd = data.payload.replace(re.start, '').replace(re.end, '');
      if (re.log.test(cmd)) {
        this.logger.log('event', cmd.replace(re.log, ''));
      } else if (cmd.includes('electro_counter')) {
        const [valueId, value] = cmd.split('=');
        this.logger.log('data', `${valueId} = ${Number(value)};`);
      } else if (cmd.includes('=')) {
        let valueId = null;
        let value = null;
        let panel = null;
        [valueId, value] = cmd.split('=');
        if (value.includes('|')) {
          [value, panel] = value.split('|');
          this.logger.log('command', `AMX [panel ${panel}]: ${valueId} = ${value}`);
        } else {
          this.logger.log('command', `Computer: ${valueId} = ${value}`);
        }
        this.beckhoff.write(valueId, value);
      } else {
        switch (cmd) {
          case 'getAll':
            this.beckhoff.getAll(data.id);
            this.logger.log('command', `${data.id}: ${cmd}`);
            break;
          default:
            this.logger.log('event', cmd);
        }
      }
    });
  }

  start() {
    this.beckhoff.connect();
    setTimeout(() => this.dataserver.start(), 10000);
    // setTimeout(() => this.beckhoff.write('K12.Room012_SetptTemp', 21), 5000);
  }

  stop() {
    this.dataserver.stop();
    this.beckhoff.disconnect();
  }
}

module.exports = {
  Dispatcher,
};

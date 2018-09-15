// const { getArg } = require('./arguments');
const { logger } = require('./logger');
const config = require('./mainconfig');
const silverlight = require('./silverlightserver');
const { BeckhoffClient } = require('./beckhoff');
const { DataServer } = require('./dataserver');
const { Dispatcher } = require('./dispatcher');

if (config.silverlightClient) {
  silverlight.createServer(logger);
}

const dispatcher = new Dispatcher(new BeckhoffClient(logger), new DataServer(logger), logger);

setTimeout(() => dispatcher.start(), 180000);

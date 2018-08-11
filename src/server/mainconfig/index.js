const config = require('./config');

const loggers = Array.isArray(config.loggers) ? config.loggers : [config.loggers];

module.exports = {
  ...config,
  loggers,
};

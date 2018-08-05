const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const config = require('./config');

const gzip = zlib.createGzip();

class FileLogger {
  static formatDayMonth(value) {
    return value.toString().length === 1 ? `0${value}` : value;
  }

  static getFileName(type, date) {
    const dateString = `${date.getFullYear()}-${FileLogger.formatDayMonth(date.getMonth() + 1)}-${FileLogger.formatDayMonth(date.getDate())}`;
    return `${config[type].fileName}-${dateString}.txt`;
  }

  static getCurrentFileName(type) {
    const date = new Date();
    return FileLogger.getFileName(type, date);
  }

  static getArchivedFileName(type) {
    const date = new Date();
    if (config[type].logArchiving && config[type].logArchiving > 0) {
      date.setMonth(date.getMonth() - config[type].logArchiving);
      return FileLogger.getFileName(type, date);
    }
    return null;
  }

  static getDeletedFileName(type) {
    const date = new Date();
    if (config[type].logExpiring && config[type].logExpiring > 0) {
      date.setMonth(date.getMonth() - config[type].logExpiring);
      return `${FileLogger.getFileName(type, date)}.gz`;
    }
    return null;
  }

  static archiveFile(type) {
    const fileName = FileLogger.getArchivedFileName(type);

    const filePath = path.join(__dirname, fileName);
    fs.stat(filePath, (err) => {
      if (!err) {
        const inp = fs.createReadStream(filePath);
        const out = fs.createWriteStream(`${filePath}.gz`);
        inp.pipe(gzip).pipe(out);
        fs.unlink(filePath, (errDeleting) => {
          if (errDeleting) {
            console.error(`Error by deleting file[${filePath}]: ${err}`);
          }
        });
      }
    });
  }

  static deleteFile(type) {
    const fileName = FileLogger.getDeletedFileName(type);

    const filePath = path.join(__dirname, fileName);
    fs.stat(filePath, (err) => {
      if (!err) {
        fs.unlink(filePath, (errDeleting) => {
          if (errDeleting) {
            console.error(`Error by deleting file[${filePath}]: ${err}`);
          }
        });
      }
    });
  }

  constructor() {
    this.timers = {
      event: null,
      alarm: null,
      command: null,
      data: null,
    };

    this.logs = {
      event: [],
      alarm: [],
      command: [],
      data: [],
    };
  }

  log(type, message) {
    if (this.logs[type] && config[type].logging) {
      this.logs[type].push(`${new Date()}: ${message};\n`);
      this.flush(type);
    }
  }

  flush(type) {
    if (this.logs[type].length && !this.timers[type]) {
      this.save(type);
      this.timers[type] = setTimeout(() => {
        this.timers[type] = null;
        this.flush(type);
      }, config[type].saveTimeInterval);
    }
  }

  save(type) {
    this.saveData(type);
    FileLogger.archiveFile(type);
    FileLogger.deleteFile(type);
  }

  saveData(type) {
    const fileName = FileLogger.getCurrentFileName(type);

    const filePath = path.join(__dirname, fileName);
    const data = this.logs[type].join('');
    this.logs[type] = [];
    fs.stat(filePath, (err) => {
      if (err) {
        fs.writeFile(filePath, data, (errWriting) => {
          if (errWriting) {
            console.error(`Error by writing file[${filePath}]: ${err.message}`);
          }
        });
      } else {
        fs.appendFile(filePath, data, (errUpdating) => {
          if (errUpdating) {
            console.error(`Error by updating file[${filePath}: ${err.message}`);
          }
        });
      }
    });
  }
}

const logger = new FileLogger();
module.exports = {
  logger,
};

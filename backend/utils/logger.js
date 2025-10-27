const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  static log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      data
    };

    // Console output
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data ? data : '');

    // File output
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  static info(message, data = null) {
    this.log('info', message, data);
  }

  static warn(message, data = null) {
    this.log('warn', message, data);
  }

  static error(message, data = null) {
    this.log('error', message, data);
  }

  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }
}

module.exports = Logger;
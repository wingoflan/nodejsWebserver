//log管理模块
let log4js = require('log4js');

//log4js config
log4js.configure({
  appenders: {
    logfile: {type: 'file', filename: '../log/log'},  //普通log
    reqLog: {type: 'file', filename: '../log/reqLog'},  //request log
    out: {type: 'stdout'} //控制台打印
  },
  categories: {
    default: {
      appenders: ['logfile', 'out'],
      level: 'all'
    },
    reqLog: {
      appenders: ['reqLog'],
      level: 'all'
    }
  }
});

let log = function (cat) {
  return log4js.getLogger(cat);
};

module.exports = {
  log: log
};

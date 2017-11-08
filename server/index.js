let cp = require('child_process'),
  fs = require('fs'),
  schedule = require('node-schedule'),
  ss = require('./modules/ss-manager'),
  traffic = require('./modules/ss-traffic'),
  logger = require('./modules/logger').log('index');

//启动web服务器进程
let server = cp.fork('server.js');
server.send('start');

//监听web服务器进程事件
server.on('message', function (msg) {

  if (msg === 'restart') {
    server.send('restart');
    logger.info('request restart');
  }

  else if (msg === 'shutdown') {
    server.send('shutdown');
    logger.info('request shutdown');
  }

  else if (msg === 'shutdown_success') {
    logger.info('shutdown success');
  }

  else if (msg === 'request_restart') {
    server = cp.fork('server.js');
    server.send('start');
  }

  else if (msg === 'unexpected_exit') {
    server = cp.fork('server.js');
    server.send('start');
    logger.error('server shutdown unexpected!!! restarting');
  }

  else logger.warn('unknown msg:', msg);

});

//初始化ss管理器
ss.init();

//ss流量记录
let trafficRecord = schedule.scheduleJob('40 * * * *', function () {
  traffic.list(function (err, result, detail) {
    if(err) throw err;
    traffic.log(result, function (err) {
      if(err) throw err;
    })
  })
});

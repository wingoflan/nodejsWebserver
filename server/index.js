let cp = require('child_process'),
  fs = require('fs'),
  ss = require('./modules/ss-manager'),
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

//检测ss服务器
ss.init();
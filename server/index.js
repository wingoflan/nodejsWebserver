let cp = require('child_process'),
  fs = require('fs'),
  log4js = require('log4js'),
  logger = log4js.getLogger('index');

//log4js config
log4js.configure({
  appenders: {
    logfile: {type: 'file', filename: '../log'},
    out: {type: 'stdout'}
  },
  categories:{
    default: {
      appenders:['logfile', 'out'],
      level: 'all'
    }
  }
});

//启动服务器进程
let server = cp.fork('server.js');
server.send('start');

//监听服务器进程事件
server.on('message', function (msg) {

  if(msg === 'restart'){
    server.send('restart');
    logger.info('request restart');
  }

  else if(msg === 'shutdown'){
    server.send('shutdown');
    logger.info('request shutdown');
  }

  else if(msg === 'shutdown_success'){
    logger.info('shutdown success');
  }

  else if(msg === 'request_restart'){
    server = cp.fork('server.js');
    server.send('start');
  }

  else if(msg === 'unexpected_exit'){
    server = cp.fork('server.js');
    server.send('start');
    logger.error('server shutdown unexpected!!! restarting');
  }

  else logger.warn('unknown msg:', msg);

});

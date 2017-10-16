let cp = require('child_process'),
  console = require('./modules/console');

//启动服务器进程
let server = cp.fork('server.js');
server.send('start');

//监听服务器进程事件
server.on('message', function (msg) {

  if(msg === 'restart'){
    server.send('restart');
    console.log('request restart');
  }

  else if(msg === 'shutdown'){
    server.send('shutdown');
    console.log('request shutdown');
  }

  else if(msg === 'shutdown_success'){
    console.log('shutdown success');
  }

  else if(msg === 'request_restart'){
    server = cp.fork('server.js');
    server.send('start');
  }

  else if(msg === 'unexpected_exit'){
    server = cp.fork('server.js');
    server.send('start');
    console.log('server shutdown unexpected!!! restarting');
  }

  else console.log('unknown msg:', msg);

});
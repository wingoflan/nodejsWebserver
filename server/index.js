let cp = require('child_process'),
  console = require('./modules/console');

let server = cp.fork('server.js');
server.send('start');

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

  else console.log('unknown msg ' + msg);

});
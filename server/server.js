/**
 * Created by wingoflan on 2017/10/16.
 */

let console = require('./modules/console');

process.on('message', function (msg) {
  if (msg === 'start') {
    let express = require('express'),
      app = express();

    //设置静态资源目录
    app.use(express.static('static'));

    app.all('*', function (req, res, next) {
      console.log('todo: check auth');
      next();
    });

    app.get('/nothing', function (req, res) {
      res.send('you\'ve get nothing!');
    });

    //关机
    app.get('/shutdown', function (req, res) {
      res.send('指令已发出');
      process.send('shutdown');
    });

    //重启
    app.get('/restart', function (req, res) {
      res.send('指令已发出');
      process.send('restart');
    });

    //404
    app.get('*', function (req, res) {
      res.sendStatus(404);
    });

    app.listen(3000, function () {
      console.log('server running at 3000!');
    });
  }

  else if(msg === 'shutdown'){
    process.on('exit', function () {
      process.send('shutdown_success');
    });
    process.exit();
  }

  else if(msg === 'restart'){
    process.on('exit', function () {
      process.send('request_restart');
    });
    process.exit();
  }

});
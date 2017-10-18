/**
 * Created by wingoflan on 2017/10/16.
 */

let log4js = require('log4js'),
  logger = log4js.getLogger('index');

//log4js config
log4js.configure({
  appenders: {
    logfile: {type: 'file', filename: '../log'},
    out: {type: 'stdout'}
  },
  categories: {
    default: {
      appenders: ['logfile', 'out'],
      level: 'all'
    }
  }
});

process.on('message', function (msg) {
  if (msg === 'start') {
    let express = require('express'),
      app = express();

    //设置静态资源目录
    app.use(express.static('static'));

    //权限检测
    app.all('*', function (req, res, next) {
      //check auth
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

    //启动服务器
    app.listen(3000, function () {
      logger.info('server running at 3000!');
    });
  }

  //关机指令
  else if (msg === 'shutdown') {
    process.on('exit', function () {
      process.send('shutdown_success');
    });
    process.exit(200);
  }

  //重启指令
  else if (msg === 'restart') {
    process.on('exit', function () {
      process.send('request_restart');
    });
    process.exit(200);
  }

});

//处理意外宕机
process.on('exit', function (code) {
  if (code != 200) {
    process.send('unexpected_exit');
  }
});
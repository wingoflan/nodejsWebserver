/**
 * Created by wingoflan on 2017/10/16.
 */

let logger = require('./modules/logger').log('server'),
  reqLogger = require('./modules/logger').log('reqLog'),
  exec = require('child_process').exec;

let ssManagerRouter = require('./router/ss-manager');

process.on('message', function (msg) {
  if (msg === 'start') {
    let express = require('express'),
      app = express();

    //设置静态资源目录
    app.use(express.static('static'));
    let sendFileOpt = {
      root: 'static/'
    };

    //全请求入口
    app.all('*', function (req, res, next) {
      //记录请求
      reqLogger.info(JSON.stringify({
        ip: req.ip,
        url: req.url,
        headers: req.headers,
      }));
      next();
    });

    //首页
    app.get('/', function (req, res) {
      res.sendFile('index.html', sendFileOpt)
    });

    //分配路由
    app.use('/ss-manager', ssManagerRouter);

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
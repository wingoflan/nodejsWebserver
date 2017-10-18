//shadowsocks manager

let nodemailer = require('nodemailer'),
  log4js = require('log4js'),
  logger = log4js.getLogger('ss-manager');

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

//邮件服务
let transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  pool: true,
  secure: true,
  port: 465,
  auth:{
    user: '493157749@qq.com',
    pass: 'tsjmtrrxvnyjbgee'
  }
});

//发送提醒邮件
let mail = function(idArr) {
  if(typeof idArr == Array && idArr.length !== 0){
    let text = idArr.toString();
    transporter.verify(function (err) {
      if(err){
        logger.error('mail service verify failed!', err);
      } else {
        logger.info('mail service verify passed!');
        transporter.sendMail({
          from: '493157749@qq.com',
          to: '493157749@qq.com',
          subject: '快到期了，快去提醒一下！',
          text: text + '的快到期了，别忘了哦~'
        }, function (err, info) {
          if(err){
            logger.error('fail to send mail', err);
          } else {
            logger.info('mail sent successful');
          }
        })
      }
    });
  }
};

//获取用户信息
let getUserConfig = function () {

};

//设置用户信息
let setUser = function () {

};

//删除用户信息
let deleteUser = function () {
  //不删?
};

//生成ss配置文件
let generatessjson = function () {

};

module.exports = {
  mail: mail
};
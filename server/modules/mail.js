//邮件服务
let nodemailer = require('nodemailer'),
  logger = require('../modules/logger').log('mailService');

//邮件配置
let transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  pool: true,
  secure: true,
  port: 465,
  auth: {
    user: '493157749@qq.com',
    pass: 'tsjmtrrxvnyjbgee'
  }
});

let sendMail = function (opt, cb) {
  let to = opt.to || '493157749@qq.com',
    subject = opt.subject || '<无标题>',
    text = opt.text || '<无内容>';
  transporter.verify(function (err) {
    if (err) {
      cb(err);
    } else {
      transporter.sendMail({
        from: '493157749@qq.com',
        to: to,
        subject: subject,
        text: text
      }, function (err) {
        if (err) {
          cb(err);
        } else {
          cb(null);
        }
      })
    }
  });
};

module.exports = {
  mail: sendMail
};
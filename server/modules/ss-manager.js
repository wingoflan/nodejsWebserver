//shadowsocks manager

let nodemailer = require('nodemailer'),
  sche = require('node-schedule'),
  fs = require('fs'),
  exec = require('child_process').exec,
  os = require('os'),
  sendMail = require('../modules/mail'),
  logger = require('../modules/logger').log('ss-manager');


//初始化ss管理器
let init = function () {
  //检测user.json和ss.json的合法性
  checkLegal(function (err) {
    if(err){
      logger.error(err);
      sendMail.mail({
        to: '493157749@qq.com',
        subject: '初始化ss失败，请检查日志！',
        text: 'error详情:' + err
      }, function (err) {
        if(err){
          logger.error('发送报错邮件失败！');
        } else {
          logger.info('已发送报错邮件: shadowsocks配置合法性检测失败');
        }
      })
    } else {
      //检查付费余额状态

    }
  })
};

//获取用户信息, cb mode
let userConfig = function (cb) {
  fs.readFile('user/user.json', 'utf-8', function (err, data) {
    if(err){
      cb(err);
    } else {
      cb(null, JSON.parse(data));
    }
  });
};

//获取ss配置, cb mode
let ssConfig = function (cb) {
  fs.readFile('../shadowsocks.json', 'utf-8', function (err, data) {
    if(err){
      cb(err);
    } else {
      cb(null, JSON.parse(data));
    }
  });
};

//生成用户json,cb mode
let setUserJson = function (data, cb) {
  data = JSON.stringify(data);
  fs.writeFile('user/user.json', data, function (err) {
    if (err) {
      cb(err);
    } else {
      cb(null);
    }
  })
};

//生成ss配置json,cb mode
let setSSJson = function (data, cb) {
  data = JSON.stringify(data);
  fs.writeFile('../shadowsocks.json', data, function (err) {
    if (err) {
      cb(err);
    } else {
      cb(null);
    }
  })
};

//重启ss服务器
let restartSS = function (cb) {
  if(os.platform() === 'linux'){
    exec('/etc/init.d/shadowsocks restart', function (err, stdout, stderr) {
      if(err){
        logger.error('重启ss服务失败！！');
        logger.error(err);
        cb(err);
      }else{
        if(stderr){
          cb(new Error(stderr));
          logger.error(stderr);
        } else {
          cb(null);
          logger.info(stdout);
        }
      }
    });
  } else {
    cb(new Error('only linux platform is supported for now...'))
  }
};

//检查配置文件合法性
let checkLegal = function (cb) {
  checkUserJson(function (err) {
    if(err){
      cb(err);
    } else {
      checkSSJson(function (err) {
        if(err){
          cb(err);
        } else {
          cb(null);
        }
      })
    }
  })
};

let checkUserJson = function (cb) {
  logger.info('开始检测user.json合法性');
  let errDesc = '';
  userConfig(function (err, user) {
    if(err){
      cb(err);
    } else {
      //检查json错误
      if(!user){
        cb(new Error('fail to read user.json'))
      } else {
        let basePort = 15555;
        if(user.user.length - (user.lastPort - basePort) !== 2){
          logger.warn('==================user.json的端口配置可能有错误！==================');
        }else if(user.user[user.user.length - 1].port != user.lastPort){
          errDesc += 'lastPort与实际的lastPort不相同！';
        }

        //cb error
        if(errDesc){
          cb(new Error(errDesc));
        } else {
          cb(null);
        }
      }
    }
  })
};

let checkSSJson = function (cb) {
  logger.info('开始检测ss.json的合法性');
  //todo:暂不进行检测
  cb(null);
};

//检测余额状态,cb参数：err Array<closeList>3天内过期的名单 Array<overList>
let checkRemain = function (cb) {
  userConfig(function (err, data) {
    if(err){
      cb(err);
    } else {
      let userList = data.user, now = Date.now(), overList = [], closeList = [];
      userList.forEach(function (user) {
        let end_date = new Date(user.start_date).getTime() + ( 2592000000 * user.remain / 10 );
        if(end_date <= now){
          //已过期
          overList.push(user.name);
        } else if(end_date - now <= 259200000){
          //3天内过期
          closeList.push(user.name);
        }
      });
      cb(null, closeList, overList);
    }
  })
};

// //新增用户
// let add = function (data, cb) {
//   let newUser = data;
//   newUser.remain = Number(newUser.remain);
//   newUser.free = !!Number(newUser.free);
//   let user = get();
//   newUser.id = user.user.length;
//   newUser.port = user.lastPort + 1;
//   newUser.active = true;
//   user.lastPort++;
//   user.user.push(newUser);
//   setUser(user, function (err) {
//     if(err){
//       cb(err);
//     } else {
//       let config = ssConfig();
//       config.port_password[newUser.port] = newUser.password;
//       setSS(config, function (err) {
//         if(err){
//           cb(null, 300, '添加成功，但是重启ss服务失败！');
//           logger.error('添加', newUser.name, '成功，但是重启ss失败！');
//         } else {
//           cb(null, 200, '添加成功');
//         }
//       });
//     }
//   });
// };
//
// //修改用户信息
// let update = function (data, cb) {
//   let err = null;
//   cb(err);
// };
//
// //删除用户信息
// let remove = function () {
//   //不删?
// };
//
// //生成ss配置文件
// let setSS = function (data, cb) {
//   data = JSON.stringify(data);
//   fs.writeFile('../shadowsocks.json', data, function (err) {
//     if (err) {
//       cb(err);
//     } else {
//       exec('/etc/init.d/shadowsocks restart', function (err, stdout, stderr) {
//         if(err){
//           logger.error('重启ss服务失败！！');
//           logger.error(err);
//           cb(err);
//         }else{
//           logger.info(stdout);
//           cb(null);
//         }
//       });
//     }
//   })
// };
//
// //生成用户json
// let setUser = function (data, cb) {
//   data = JSON.stringify(data);
//   fs.writeFile('user/user.json', data, function (err) {
//     if (err) {
//       cb(err);
//     } else {
//       cb(null);
//     }
//   })
// };
//
// //检测余额状态
// let checkRemain = function () {
//
//   function check() {
//     let user = get().user, arr = [];
//
//     user.forEach(function (user) {
//       if(user.active && !user.free){
//         //30天
//         let end_date = new Date(user.start_date).getTime() + (2592000000 * user.remain / 10);
//         //3天内ss到期
//         if(end_date - Date.now() <= 259200000 && end_date - Date.now() > 0){
//           arr.push(user.name);
//         }
//         //ss到期
//         else if(end_date - Date.now()<=0){
//           let config = ssConfig();
//           delete config.port_password[user.port];
//           setSS(config, function (err) {
//             if(err){
//               logger.error('停用', user.name, '失败');
//             } else {
//               logger.info('已停用：', user.name);
//             }
//           });
//         }
//       }
//     });
//     mail(arr);
//   }
//
//   check();
//
//   sche.scheduleJob('0 0 10 * * *', function () {
//     check();
//   })
//
// };

module.exports = {
  // add: add,
  // update: update,
  // remove: remove,
  // get: get,
  // checkRemain: checkRemain,
  init: init
};
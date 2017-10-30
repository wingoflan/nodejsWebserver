//shadowsocks manager

let nodemailer = require('nodemailer'),
  sche = require('node-schedule'),
  fs = require('fs'),
  exec = require('child_process').exec,
  os = require('os'),
  async = require('async'),
  sendMail = require('../modules/mail'),
  logger = require('../modules/logger').log('ss-manager');


//初始化ss管理器
let init = function () {
  async.waterfall(
    [
      checkLegal,
      checkRemain,
    ],
    function (err, closeList, overList) {
      if (err) {
        logger.error(err);
        sendMail.mail({
          to: '493157749@qq.com',
          subject: '服务器初始化出错！',
          text: '服务器初始化出错，请检查日志。<br>' + err
        }, function (err) {

        });
      } else {
        if (closeList.length === 0 && overList.length === 0) {
          logger.info('无即将过期或已过期的用户！');
          logger.info('ss服务器初始化完毕');
        }
        else {
          let text = '';
          if (closeList.length != 0) {
            text += '即将过期：' + closeList.join('、') + ',';
          }
          if (overList.length != 0) {
            text += '已到期：' + overList.join('、');
          }
          //发送余额提醒邮件
          sendMail.mail({
            to: '493157749@qq.com',
            subject: '余额提醒',
            text: text
          }, function (err) {
            if (err) logger.error('发送余额提醒邮件出错！');
          });
          //过期用户处理
          if (overList.length != 0) {
            async.waterfall([
              userConfig, //获取用户json
              function (data, cb) {  //生成新的用户object传入下个函数，传递将过期用户的端口
                let overPort = [];
                data.user.forEach(function (user) {
                  if (user.name.indexOf(overList) > -1) {
                    user.active = false;
                    overPort.push(user.port);
                  }
                });
                cb(null, data, overPort);
              },
              function (data, overPort, cb) { //生成新的用户json，传递overPort
                let err = null;
                setUserJson(data, function (e) {
                  if (e) err = e;
                  cb(err, overPort);
                })
              },
              function (overPort, cb) {
                ssConfig(function (err, data) {
                  overPort.forEach(function (port) {
                    if (data.port_password[port]) {
                      delete data.port_password[port]
                    }
                  });
                  cb(err, data);
                })
              },
              setSSJson,
              restartSS
            ], function (err) {
              if (err) {
                logger.error(err);
                if (os.platform() === 'linux') {
                  sendMail.mail({
                    to: '493157749@qq.com',
                    subject: '处理过期用户出错',
                    text: '处理过期用户出错，请检查日志。<br>' + err
                  }, function (err) {

                  });
                }
              } else {
                logger.info('ss服务器初始化完毕');
              }
            });
          } else {
            logger.info('ss服务器初始化完毕');
          }
        }
      }
    });
};

//获取用户信息, cb mode
let userConfig = function (cb) {
  fs.readFile('user/user.json', 'utf-8', function (err, data) {
    if (err) {
      cb(err);
    } else {
      cb(null, JSON.parse(data));
    }
  });
};

//获取ss配置, cb mode
let ssConfig = function (cb) {
  fs.readFile('../shadowsocks.json', 'utf-8', function (err, data) {
    if (err) {
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
  if (os.platform() === 'linux') {
    exec('/etc/init.d/shadowsocks restart', function (err, stdout, stderr) {
      if (err) {
        logger.error('重启ss服务失败！！');
        logger.error(err);
        cb(err);
      } else {
        if (stderr) {
          cb(new Error(stderr));
          logger.error(stderr);
        } else {
          cb(null);
          logger.info(stdout);
        }
      }
    });
  } else {
    cb(new Error('Fail to restart shadowsocks: only linux platform is supported for now...'))
  }
};

//检查配置文件合法性
let checkLegal = function (cb) {
  checkUserJson(function (err) {
    if (err) {
      cb(err);
    } else {
      checkSSJson(function (err) {
        if (err) {
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
    if (err) {
      cb(err);
    } else {
      //检查json错误
      if (!user) {
        cb(new Error('fail to read user.json'))
      } else {
        let basePort = 15555;
        if (user.user.length - (user.lastPort - basePort) !== 2) {
          logger.warn('==================user.json的端口配置可能有错误！==================');
        } else if (user.user[user.user.length - 1].port != user.lastPort) {
          errDesc += 'lastPort与实际的lastPort不相同！';
        }

        //cb error
        if (errDesc) {
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
  let userData, ssData;
  userConfig(function (err, data) {
    if(err){
      cb(err);
    } else {
      userData = data;
      ssConfig(function (err, data) {
        if(err){
          cb(err);
        } else {
          ssData = data;
          let activeUser = [], activePort = [];
          userData.user.forEach(function (user) {
            if(user.active){
              activeUser.push(user.port)
            }
          });
          for (let port in ssData.port_password){
            activePort.push(port);
          }
          if(activePort.toString() !== activeUser.toString()){
            cb(new Error('Fail to check ss json compare to user json!'))
          } else {
            cb(null);
          }
        }
      })
    }
  });
  //todo:暂不进行检测
  // cb(null);
};

//检测余额状态,cb参数：err Array<closeList>3天内过期的名单 Array<overList>
let checkRemain = function (cb) {
  userConfig(function (err, data) {
    if (err) {
      cb(err);
    } else {
      let userList = data.user, now = Date.now(), overList = [], closeList = [];
      userList.forEach(function (user) {
        if (user.active && !user.free) {
          let end_date = new Date(user.start_date).getTime() + ( 2592000000 * user.remain / 10 );
          if (end_date <= now) {
            //已过期
            overList.push(user.name);
          } else if (end_date - now <= 259200000) {
            //3天内过期
            closeList.push(user.name);
          }
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
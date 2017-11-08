//shadowsocks manager

let nodemailer = require('nodemailer'),
  sche = require('node-schedule'),
  fs = require('fs'),
  exec = require('child_process').exec,
  spawn = require('child_process').spawn,
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

//获取用户信息
//cb: err, data
let userConfig = function (cb) {
  fs.readFile('json/user.json', 'utf-8', function (err, data) {
    if (err) {
      cb(err);
    } else {
      cb(null, JSON.parse(data));
    }
  });
};

//获取ss配置
//cb: err, data
let ssConfig = function (cb) {
  fs.readFile('../shadowsocks.json', 'utf-8', function (err, data) {
    if (err) {
      cb(err);
    } else {
      cb(null, JSON.parse(data));
    }
  });
};

//生成用户json
//cb: err
let setUserJson = function (data, cb) {
  data = JSON.stringify(data);
  fs.writeFile('json/user.json', data, function (err) {
    if (err) {
      cb(err);
    } else {
      cb(null);
    }
  })
};

//生成ss配置json
//cb: err
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
//cb: err
let restartSS = function (cb) {
  if (os.platform() === 'linux') {
    let stderr = '', stdout = '';
    let rs = spawn('/etc/init.d/shadowsocks', ['restart']);
    rs.stderr.on('data', function (data) {
      stderr += data;
    });
    rs.stdout.on('data', function (data) {
      stdout += data;
    });
    rs.on('close', function (code, p2, p3, p4) {
      logger.info('p2', p2);
      if(code === 0){
        logger.info('\nstdout:\n', stdout);
        logger.info('\nstderr:\n', stderr);
        logger.info('重启ss服务成功！');
        cb(null);
      }
    });
    rs.on('error', function (err) {
      cb(err);
    });
  } else {
    cb(new Error('Fail to restart shadowsocks: only linux platform is supported for now...'))
  }
};

//检查配置文件合法性
//cb: err
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

//cb: err
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

//cb: err
let checkSSJson = function (cb) {
  logger.info('开始检测ss.json的合法性');
  let userData, ssData;
  userConfig(function (err, data) {
    if(err){
      cb(err);
    }
    else {
      userData = data;
      ssConfig(function (err, data) {
        if(err){
          cb(err);
        } else {
          ssData = data;
          async.waterfall([
            function (cb) {
              cb(null, userData, ssData);
            },
            checkPort,
            checkPassword
          ], function (err) {
            if(err){
              cb(err);
            } else {
              cb(null);
            }
          })
        }
      })
    }
  });
};

//检查ss.json和user.json的port设置
let checkPort = function (userData, ssData, cb) {
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
    cb(new Error('check ss json fail: port not match.'));
    logger.error('activePort:' + activePort);
    logger.error('activeUser:' + activeUser);
  } else {
    cb(null, userData, ssData);
  }
};

//检查ss.json和user.json的password设置
let checkPassword = function (userData, ssData, cb) {
  let userPass = [], ssPass = [];
  userData.user.forEach(function (user) {
    if(user.active){
      userPass.push(user.password);
    }
  });
  for (let port in ssData.port_password){
    ssPass.push(ssData.port_password[port]);
  }
  if(userPass.toString() !== ssPass.toString()){
    cb(new Error('check ss json fail: passowrd not match.'));
    logger.error('userPass:' + userPass);
    logger.error('ssPass:' + ssPass);
  } else {
    cb(null);
  }
};

//检测余额状态,cb参数：err Array<closeList>3天内过期的名单 Array<overList>已过期的名单
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

//新增用户
//cb: err
let addUser = function (data, cb) {
  let cacheInput = data, cacheUser, cacheSS;
  async.waterfall([
    function (cb) {
      let user = data;
      user.remain = Number(user.remain);
      user.free = !!Number(user.free);
      cb(null, user)
    },
    function (user, cb) {
      userConfig(function (err, oUser) {
        if(err){
          cb(err, 501, 'Fail to read userConfig');
        } else {
          cacheUser = oUser;
          let uList = oUser.user;
          user.id = uList.length;
          user.port = oUser.lastPort + 1;
          user.active = true;
          oUser.lastPort ++;
          oUser.user.push(user);
          cb(null, oUser);
        }
      })
    },
    function (oUser, cb) {
      setUserJson(oUser, function (err) {
        if(err){
          cb(err, 502, 'Fail to write userConfig');
        } else {
          let newUser = oUser.user[oUser.user.length - 1];
          cb(null, newUser);
        }
      })
    },
    function (newUser, cb) {
      ssConfig(function (err, data) {
        if(err){
          cb(err, 504, 'Fail to read ss config');
        } else {
          cacheSS = data;
          data.port_password[newUser.port] = newUser.password;
          cb(null, data, newUser);
        }
      })
    },
    function (data, newUser, cb) {
      setSSJson(data, function (err) {
        if(err){
          cb(err, 505, 'Fail to write ss config');
        } else {
          cb(null, newUser);
        }
      })
    },
    function (newUser, cb) {
      if(os.platform() === 'linux'){
        restartSS(function (err) {
          if(err){
            logger.error('Fail to restart SS service!');
            cb(err, 503, 'Fail to restart SS service.');
          } else {
            logger.info('Added new user:' + JSON.stringify(newUser));
            cb(null, 200, 'ok');
          }
        })
      } else {
        logger.info('test mode, restart ss service here');
        logger.info('Added new user:' + JSON.stringify(newUser));
        cb(null, 200, 'ok');
      }
    }
  ], function (err, code, msg) {
    if(err){
      setSSJson(cacheSS, function (err) {
        if(err) {logger.error('Fail to recover cached SS data:\n', cacheSS);}
        logger.info('SS data recoverd:\n', cacheSS)
      });
      setUserJson(cacheUser, function (err) {
        if(err) {logger.error('Fail to recover cached user data:\n', cacheUser);}
        logger.info('User data recovered:\n', cacheUser);
      });
      logger.error('Fail to add new user:' + JSON.stringify(cacheInput));
      logger.error(err);
    }
    cb(err, code, msg);
  });
};

let updateUser = function (user, cb) {

};

module.exports = {
  add: addUser,
  get: userConfig,
  update: updateUser,
  init: init
};
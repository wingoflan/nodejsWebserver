let exec = require('child_process').exec,
  logger = require('../modules/logger').log('traffic'),
  fs = require('fs');

//获取所有流量信息
function listTraffic(cb) {
  let detail = {}, result = {};
  exec('iptables -v -n -x -L', function (err, stdout, stderr) {
    if(err) throw err;
    if(stderr){
      throw new Error(stderr);
    }
    let outArr = stdout.split('\n'), portArr = [];
    for(let i = 0; i < 2; i++){
      outArr.shift();
    }
    for(let j = 0; j < 7; j++){
      outArr.pop();
    }
    outArr.forEach(function (data) {
      let dataArr = data.trim().replace(/ {2,}/g, ' ').split(' ');
      let purePort = dataArr[10].replace('dpt:', '');
      let port = dataArr[9] + ' ' + purePort;
      if(Number(purePort) > 15000){
        detail[port] = {
          packages: dataArr[0],
          bytes: dataArr[1],
          target: dataArr[2],
          protocolType: dataArr[3],
          opt: dataArr[4],
          in: dataArr[5],
          out: dataArr[6],
          source: dataArr[7],
          destination: dataArr[8],
          port: port,
          purePort: purePort
        };
        if(portArr.indexOf(purePort) === -1){
          portArr.push(purePort)
        }
      }
    });
    portArr.forEach(function (port) {
      if(!result[port]){
        result[port] = {
          port: port,
          udpPackages: 0,
          tcpPackages: 0,
          packages: 0,
          udpBytes: 0,
          tcpBytes: 0,
          bytes: 0
        }
      }
    });
    for(let port in detail){
      let purePort = detail[port].purePort, protocolType = detail[port].protocolType;
      if(detail[port].target === 'ACCEPT'){
        if(protocolType === 'udp'){
          result[purePort].udpPackages = Number(result[purePort].udpPackages) + Number(detail[port].packages);
          result[purePort].udpBytes = Number(result[purePort].udpBytes) + Number(detail[port].bytes);
          result[purePort].packages = Number(result[purePort].packages) + Number(detail[port].packages);
          result[purePort].bytes = Number(result[purePort].bytes) + Number(detail[port].bytes);
        } else if(protocolType === 'tcp') {
          result[purePort].tcpPackages = Number(result[purePort].tcpPackages) + Number(detail[port].packages);
          result[purePort].tcpBytes = Number(result[purePort].tcpBytes) + Number(detail[port].bytes);
          result[purePort].packages = Number(result[purePort].packages) + Number(detail[port].packages);
          result[purePort].bytes = Number(result[purePort].bytes) + Number(detail[port].bytes);
        }
      }
    }
    cb(null, result, detail);
  });
}

//根据port获取流量信息
function getTraffic(port, cb) {
  fs.readFile('../log/traffic.json', 'utf-8', function (err, data) {
    if(err){
      cb(err);
    }
    else {
      let json = JSON.parse(data), obj = {};
      for(let ts in json){
        for(let pt in json[ts]){
          if(pt === port){
            obj[ts] = json[ts][pt].bytes;
          }
        }
      }
      cb(null, obj);
    }
  })
}

module.exports = {
  list: listTraffic,
  log: function (result, cb) {
    fs.readFile('../log/traffic.json', function (err, data) {
      if(err) {cb(err);}
      else {
        let d = JSON.parse(data), now = Date.now();
        d[now] = result;
        d = JSON.stringify(d);
        fs.writeFile('../log/traffic.json', d, function (err) {
          if(err) throw err;
          logger.info('traffic logged at', now, ':', JSON.stringify(result));
        })
      }
    })
  },
  getTraffic: getTraffic
};
function prefix() {
  function az(str) {
    return str.toString().length == 1 ? '0' + str : str;
  }

  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hour = date.getHours();
  var min = date.getMinutes();
  var sec = date.getSeconds();
  return '[' + year + '.' + az(month) + '.' + az(day) + ' ' + az(hour) + ':' + az(min) + ':' + az(sec) + ']';
}

var Console = {
  log: function () {
    var args = Array.from(arguments);
    if(typeof arguments[0] === 'boolean'){
      if(!arguments[0]){
        let noPrefixMsg = '';
        args.splice(0,1);
        args.forEach(function (str) {
          noPrefixMsg = noPrefixMsg + ' ' + str.toString();
        });
        console.log(noPrefixMsg);
      }
    }else{
      var msg = prefix();
      args.forEach(function (str) {
        msg = msg + ' ' + str.toString();
      });
      console.log(msg);
    }
  }
};

module.exports = Console;
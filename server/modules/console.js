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
    var msg = prefix();
    var args = Array.from(arguments);
    args.forEach(function (str) {
      msg = msg + ' ' + str.toString();
    });
    console.log(msg);
  }
};

module.exports = Console;
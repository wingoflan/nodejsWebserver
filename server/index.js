let express = require('express'),
  app = express();

//设置静态资源目录
app.use(express.static('static'));

app.get('*', function (req, res) {
  res.redirect('/');
});

app.listen(3000, function () {
  console.log('server running at 3000!');
});
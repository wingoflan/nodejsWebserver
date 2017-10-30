let express = require('express'),
  router = express.Router(),
  bodyParser = require('body-parser'),
  manager = require('../modules/ss-manager');

//静态资源目录
let sendFileOpt = {
  root: 'static/ss-manager/'
};

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended:true}));

router.get('/', function (req, res) {
  res.sendFile('index.html', sendFileOpt)
});

router.get('/getUser', function (req, res) {
  manager.get(function (err, data) {
    if(err){
      res.sendStatus(500);
    } else {
      res.json({
        code: 200,
        msg: 'ok',
        users: data.user
      })
    }
  })
});

router.post('/addUser', function (req, res) {
  let user = req.body;
  manager.add(user, function (err, code, msg) {
    if(err){
      res.sendStatus(500);
    } else {
      res.json({
        code: code,
        msg: msg
      });
    }
  })
});

router.post('/updateUser', function (req, res) {
  let user = {};
  manager.update(user, function (err) {
    if(err){
      res.sendStatus(500);
    } else {
      res.json({
        opt: 200
      })
    }
  })
});

router.get('*', function (req, res) {
  res.sendStatus(404);
});

module.exports = router;
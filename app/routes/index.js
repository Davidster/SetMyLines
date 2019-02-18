var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Yahoo Fantasy Automation' });
});

module.exports = router;

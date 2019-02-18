var express = require("express");
var router = express.Router();

router.get("/", function(req, res, next) {
  res.redirect(oauth2.authorizationCode.authorizeURL({
    redirect_uri: "http://ec2-52-87-166-236.compute-1.amazonaws.com/loginCallback"
  }));
});

module.exports = router;

var express = require("express");
var router = express.Router();

router.get("/", function(req, res, next) {
  res.redirect(oauth2.authorizationCode.authorizeURL({
    redirect_uri: `https://${process.env.OAUTH_DOMAIN}/loginCallback`,
    scope: "openid fspt-w"
  }));
});

module.exports = router;

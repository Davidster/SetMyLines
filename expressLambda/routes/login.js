var express = require("express");
var router = express.Router();

router.get("/", (req, res, next) => {
  res.redirect(oauth2.authorizationCode.authorizeURL({
    redirect_uri: `https://${process.env.OAUTH_DOMAIN}/loginCallback`,
    scope: "openid fspt-w"
  }));
});

module.exports = router;

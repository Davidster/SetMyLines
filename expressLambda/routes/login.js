const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");

router.get("/", asyncMiddleware(async (req, res, next) => {
  res.redirect(oauth2.authorizationCode.authorizeURL({
    redirect_uri: `https://${process.env.OAUTH_DOMAIN}/api/loginCallback`,
    scope: "openid fspt-w"
  }));
}));

module.exports = router;

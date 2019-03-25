const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const oauth2 = require(path.join(process.env.COMMON_PATH, "oauth2"));

router.get("/", asyncMiddleware(async (req, res, next) => {
  res.redirect(oauth2.authorizationCode.authorizeURL({
    redirect_uri: `https://${process.env.OAUTH_DOMAIN}/api/loginCallback`,
    scope: "openid fspt-w"
  }));
}));

module.exports = router;

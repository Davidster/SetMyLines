const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const oauth2 = require(path.join(process.env.LIB_PATH, "yahoo/oauth2"));

router.get("/", asyncMiddleware(async (req, res, next) => {
  res.json({ 
    loginUrl: oauth2.authorizationCode.authorizeURL({
      redirect_uri: `https://${process.env.YAHOO_OAUTH_DOMAIN}/login`,
      scope: "openid fspt-w sdps-r"
    })
  });
}));

module.exports = router;

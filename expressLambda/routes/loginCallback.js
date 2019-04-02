const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const oauth2 = require(path.join(process.env.COMMON_PATH, "yahoo/oauth2"));

/* GET home page. */
router.get("/", asyncMiddleware(async (req, res, next) => {
  const tokenConfig = {
    code: req.query.code,
    redirect_uri: `https://${process.env.YAHOO_OAUTH_DOMAIN}/api/loginCallback`
  };
  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig)
    const accessToken = oauth2.accessToken.create(result);
    res.cookie("accessToken", JSON.stringify(accessToken.token), cookieOptions);
    res.redirect("/");
  } catch (error) {
    console.log("Access Token Error", error.message);
    res.send("Login Error");
  }
}));

module.exports = router;

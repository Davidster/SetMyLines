const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const oauth2 = require(path.join(process.env.LIB_PATH, "yahoo/oauth2"));
const cookieOptions = require(path.join(process.env.LIB_PATH, "yahoo/cookieOptions"));

router.post("/", asyncMiddleware(async (req, res, next) => {
  console.log(req.query.code);
  const tokenConfig = {
    code: req.query.code,
    redirect_uri: `https://${process.env.YAHOO_OAUTH_DOMAIN}/login`
  };
  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig)
    const accessToken = oauth2.accessToken.create(result);
    console.log("Setting accessToken cookie with options", cookieOptions, "with value", JSON.stringify(accessToken.token));
    res.cookie("accessToken", JSON.stringify(accessToken.token), cookieOptions);
    res.json({});
  } catch (error) {
    console.log("Access Token Error", error);
    console.log("Access Token Error", error.message);
    res.clearCookie("accessToken");
    res.status(401).send();
  }
}));

module.exports = router;

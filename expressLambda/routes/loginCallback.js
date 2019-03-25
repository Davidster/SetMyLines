const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");

/* GET home page. */
router.get("/", asyncMiddleware(async (req, res, next) => {
  const tokenConfig = {
    code: req.query.code,
    redirect_uri: `https://${process.env.OAUTH_DOMAIN}/api/loginCallback`
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

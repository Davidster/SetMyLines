var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', async (req, res, next) => {
  const tokenConfig = {
    code: req.query.code,
    redirect_uri: "http://ec2-52-87-166-236.compute-1.amazonaws.com/loginCallback"
  };
  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig)
    const accessToken = oauth2.accessToken.create(result);
    res.cookie("accessToken", JSON.stringify(accessToken.token));
    res.render("loginRedirect");
  } catch (error) {
    console.log('Access Token Error', error.message);
    res.send('Login Error');
  }
});

module.exports = router;

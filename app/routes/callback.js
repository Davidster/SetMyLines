var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', async (req, res, next) => {
  console.log(req.query);
  let clientID = process.env.CLIENT_ID;
  let clientSecret = process.env.CLIENT_SECRET;
  // Set the configuration settings
  const credentials = {
    client: {
      id: clientID,
      secret: clientSecret
    },
    auth: {
      tokenHost: "https://api.login.yahoo.com",
      authorizePath: "oauth2/request_auth",
      tokenPath: "oauth2/get_token"
    }
  };

  // Initialize the OAuth2 Library
  const oauth2 = require("simple-oauth2").create(credentials);

  // Get the access token object (the authorization code is given from the previous step).
  const tokenConfig = {
    code: req.query.code,
    redirect_uri: "http://ec2-52-87-166-236.compute-1.amazonaws.com/callback"
  };

  // Save the access token
  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig)
    const accessToken = oauth2.accessToken.create(result);
    res.render("loginRedirect", { accessTokenObj: JSON.stringify(accessToken.token) });
  } catch (error) {
    console.log('Access Token Error', error.message);
    res.send('Login Error');
  }
});

module.exports = router;

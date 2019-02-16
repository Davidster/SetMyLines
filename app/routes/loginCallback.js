var express = require('express');
var router = express.Router();

/* GET users listing. */
router.post('/', function(req, res, next) {
  console.log("Login request body:", req.body);
  let clientID = process.env.CLIENT_ID;
  let clientSecret = process.env.CLIENT_SECRET;

  // Get the access token object (the authorization code is given from the previous step).
  const tokenConfig = {
    code: '<code>',
    redirect_uri: 'http://localhost:3000/callback',
    scope: '<scope>', // also can be an array of multiple scopes, ex. ['<scope1>, '<scope2>', '...']
  };

  // Save the access token
  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig)
    const accessToken = oauth2.accessToken.create(result);
  } catch (error) {
    console.log('Access Token Error', error.message);
  }

  res.send('respond with a resource');
});

module.exports = router;

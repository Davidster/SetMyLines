var express = require("express");
var router = express.Router();

/* GET users listing. */
router.get("/", function(req, res, next) {
  console.log("Login request body:", req.body);
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

  // Authorization oauth2 URI
  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: "http://ec2-52-87-166-236.compute-1.amazonaws.com/callback"
  });

  res.redirect(authorizationUri);
});

module.exports = router;

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
if(!clientID || !clientSecret) {
  console.log("missing client id or client secret");
  process.exit(1);
}
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
module.exports = oauth2 = require("simple-oauth2").create(credentials);

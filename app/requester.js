const rp = require("request-promise");
const cheerio = require("cheerio");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");

const API_BASE_URL = "https://fantasysports.yahooapis.com/fantasy/v2/";
const DISCOVERY_DOCUMENT_URL = "https://login.yahoo.com/.well-known/openid-configuration";
const EXPIRATION_WINDOW_IN_SECONDS = 300;

/*
  verifies the signature of the idToken and
  return the contained user attributes
  TODO: read max-age from jwk and cache the value instead of requesting every time
*/
let verifyIDToken = async (idToken) => {
  let joseHeader = JSON.parse(Buffer.from(idToken.split(".")[0], "base64").toString());
  let jwksUrl = await rp(DISCOVERY_DOCUMENT_URL).then(res=>JSON.parse(res).jwks_uri);
  let jwk = await rp(jwksUrl).then(res=>JSON.parse(res).keys.filter(jwk=>jwk.kid===joseHeader.kid)[0]);
  return new Promise((resolve, reject) => {
    jwt.verify(idToken, jwkToPem(jwk), (err, decoded) => {
      if(err) {
        /*
          If the token happens to be both expired and holding an invalid signature,
          then the invalid signature error will take precedence. Here, we choose to ignore
          the expiry of the id token and instead check the expiry of the access token elsewhere.
        */
        if(err.name === "TokenExpiredError") {
          console.log("ID Token is expired but signature is valid... ignoring error.");
        } else {
          return reject(err);
        }
      }
      resolve(decoded);
    });
  });
};

module.exports = async (query, accessToken, res) => {

  // verify the user's id
  try {
    let userInfo = await verifyIDToken(accessToken.id_token);
    console.log(`Making request to /${query.split(";")[0]} on behalf of ${userInfo.sub}`);
    console.log(`ID token expires at ${new Date(userInfo.exp * 1000).toLocaleString()}`);
  } catch (err) {
    console.log("Error validating user id_token");
    throw err;
  }

  // refresh the token if needed
  const expirationTimeInSeconds = new Date(accessToken.expires_at).getTime() / 1000;
  const expirationWindowStart = expirationTimeInSeconds - EXPIRATION_WINDOW_IN_SECONDS;
  const nowInSeconds = (new Date()).getTime() / 1000;
  const shouldRefresh = nowInSeconds >= expirationWindowStart;
  if (shouldRefresh) {
    try {
      console.log("Token expired. Refreshing");
      let newAccessToken = await oauth2.accessToken.create(accessToken).refresh();
      accessToken = {
        ...newAccessToken.token,
        id_token: accessToken.id_token
      };
      res.cookie("accessToken", JSON.stringify(accessToken));
    } catch (err) {
      console.log("Error refreshing access token");
      throw err;
    }
  }

  // make signed request to Yahoo
  try {
    let response = await rp({ url: new URL(query, API_BASE_URL).href, headers: { authorization: `Bearer ${accessToken.access_token}` } });
    return cheerio.load(response);
  } catch(err) {
    console.log("Error sending request to Yahoo");
    throw err;
  }
};

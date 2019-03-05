const rp = require("request-promise");
const cheerio = require("cheerio");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");

const API_BASE_URL = "https://fantasysports.yahooapis.com/fantasy/v2/";
const DISCOVERY_DOCUMENT_URL = "https://login.yahoo.com/.well-known/openid-configuration";
const EXPIRATION_WINDOW_IN_SECONDS = 300;

/*
  Verifies the signature of the idToken and
  returns the contained user attributes
  TODO: read max-age from jwk+discovery doc and
  cache the value instead of requesting every time

  If the token happens to be both expired and holding an invalid signature,
  then the invalid signature error will take precedence. Here, we choose to ignore
  the expiry of the id token and instead check the expiry of the access token elsewhere.
*/
let verifyIDToken = async (idToken) => {
  let splitToken = idToken.split(".");
  let joseHeader = JSON.parse(Buffer.from(splitToken[0], "base64").toString());
  let payload = JSON.parse(Buffer.from(splitToken[1], "base64").toString());
  let jwksUrl = await rp(DISCOVERY_DOCUMENT_URL).then(res=>JSON.parse(res).jwks_uri);
  let jwk = await rp(jwksUrl).then(res=>JSON.parse(res).keys.filter(jwk=>jwk.kid===joseHeader.kid)[0]);
  return new Promise((resolve, reject) => {
    jwt.verify(idToken, jwkToPem(jwk), err => {
      if(err && err.name !== "TokenExpiredError") {
        return reject(err);
      }
      resolve(payload);
    });
  });
};

let refreshTokenIfNeeded = async (accessToken, res) => {
  // refresh the token if needed
  const expirationTimeInSeconds = new Date(accessToken.expires_at).getTime() / 1000;
  const expirationWindowStart = expirationTimeInSeconds - EXPIRATION_WINDOW_IN_SECONDS;
  const nowInSeconds = (new Date()).getTime() / 1000;
  const shouldRefresh = nowInSeconds >= expirationWindowStart;
  if (shouldRefresh) {
    console.log("Token expired. Refreshing");
    let newAccessToken = await oauth2.accessToken.create(accessToken).refresh();
    accessToken = {
      ...newAccessToken.token,
      id_token: accessToken.id_token
    };
    res.cookie("accessToken", JSON.stringify(accessToken));
  }
  return accessToken;
};

module.exports.requester = async (query, accessToken, res, enableLogs = true) => {

  // verify the user's id
  try {
    let userInfo = await verifyIDToken(accessToken.id_token);
    if(enableLogs) {
      console.log(`Making request to /${query.split(";")[0]} on behalf of ${userInfo.sub}`);
    }
    // console.log(`ID token expires at ${new Date(userInfo.exp * 1000).toLocaleString()}`);
  } catch (err) {
    if(enableLogs) {
      console.log("Error validating user id_token");
    }
    throw err;
  }

  try {
    accessToken = await refreshTokenIfNeeded(accessToken, res);
  } catch (err) {
    if(enableLogs) {
      console.log("Error refreshing access token");
    }
    throw err;
  }

  // make signed request to Yahoo
  try {
    let response = await rp({ url: `${API_BASE_URL}${query}`, headers: { authorization: `Bearer ${accessToken.access_token}` } });
    return cheerio.load(response);
  } catch(err) {
    if(enableLogs) {
      console.log("Error performing yahoo request");
    }
    throw err;
  }
};
module.exports.refreshTokenIfNeeded = refreshTokenIfNeeded;

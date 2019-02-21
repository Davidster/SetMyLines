const rp = require("request-promise");
const cheerio = require("cheerio");

const API_BASE_URL = "https://fantasysports.yahooapis.com/fantasy/v2/";

module.exports = async (query, accessToken, res) => {

  // check if accessToken is expired, also verify id token
  // https://developer.yahoo.com/oauth2/guide/openid_connect/decode_id_token.html
  try {
    let response = await rp({ url: new URL(query, API_BASE_URL).href, headers: { authorization: `Bearer ${accessToken.access_token}` } });
    return cheerio.load(response);
  } catch(err) {
    if(err.statusCode === 401 && err.error.indexOf("token_expired") !== 0) {
      console.log("Token expired! Telling client to refresh");
      res.status(401).send("token_expired");
    } else {
      throw err;
    }
  }
};

var express = require("express");
var router = express.Router();

/* GET users listing. */
router.post("/", async (req, res, next) => {
  let accessToken = oauth2.accessToken.create(JSON.parse(req.body.accessTokenObj));
  try {
    accessToken = await accessToken.refresh();
  } catch (error) {
    console.log('Error refreshing access token: ', error.message);
    return res.status(500).send();
  }
  res.send(JSON.stringify(accessToken.token));
});

module.exports = router;

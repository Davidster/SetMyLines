var express = require("express");
var router = express.Router();
const { verifyIDToken } = require("../requester");

router.get("/", async (req, res, next) => {
  try {
    await verifyIDToken(JSON.parse(req.cookies.accessToken).id_token);
    res.status(200).send(JSON.stringify({
      csrfToken: req.csrfToken()
    }));
  } catch (err) {
    res.status(401).send();
  }
});

module.exports = router;

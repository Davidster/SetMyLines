const express = require("express");
const router = express.Router();
const { verifyIDToken } = require("../utils/requester");
const asyncMiddleware = require("./asyncMiddleware");

router.get("/", async (req, res, next) => {
  try {
    await verifyIDToken(JSON.parse(req.cookies.accessToken).id_token);
    res.json({ csrfToken: req.csrfToken() });
  } catch (err) {
    console.log(err);
    res.status(401).send();
  }
});

module.exports = router;

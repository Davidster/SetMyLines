const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const { verifyIDToken } = require(path.join(process.env.LIB_PATH, "yahoo/requester"));

router.get("/", asyncMiddleware(async (req, res, next) => {
  if(!req.cookies.accessToken) {
    console.log("No accessToken cookie found");
    return res.status(401).send();
  }
  try {
    await verifyIDToken(JSON.parse(req.cookies.accessToken).id_token);
    res.json({ csrfToken: req.csrfToken() });
  } catch (err) {
    console.log(err);
    res.status(401).send();
  }
}));

module.exports = router;

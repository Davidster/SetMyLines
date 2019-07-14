const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");

router.post("/", asyncMiddleware(async (req, res, next) => {
  res.clearCookie("accessToken");
  res.json({});
}));

module.exports = router;

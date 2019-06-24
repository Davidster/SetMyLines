const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");

router.get("/", asyncMiddleware(async (req, res, next) => {
  res.clearCookie("accessToken");
  res.redirect("/login");
}));

module.exports = router;

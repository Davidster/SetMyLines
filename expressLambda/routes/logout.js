var express = require("express");
var router = express.Router();

router.get("/", (req, res, next) => {
  res.clearCookie("accessToken");
  res.redirect("/");
});

module.exports = router;

var express = require("express");
var router = express.Router();
const { verifyIDToken } = require("../requester");

router.get("/", async (req, res, next) => {
  try {
    await verifyIDToken(JSON.parse(req.cookies.accessToken).id_token);
    res.render("index", { title: "Yahoo Fantasy Automation", csrfToken: req.csrfToken() });
  } catch (err) {
    console.log("error in index:", err);
    res.redirect("/login");
  }
});

module.exports = router;

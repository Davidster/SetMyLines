var express = require("express");
var router = express.Router();
var passport = require("passport");

router.get("/login", passport.authenticate("yahoo"));

router.get("/loginCallback", passport.authenticate("yahoo", { failureRedirect: "/login" }), (req, res) => {
  // Successful authentication, redirect home.
  res.redirect("/");
});

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// router.get("/", function(req, res, next) {
//   res.redirect(oauth2.authorizationCode.authorizeURL({
//     redirect_uri: `http://ec2-52-87-166-236.compute-1.amazonaws.com/loginCallback`
//   }));
// });

module.exports = router;

var express = require("express");
var router = express.Router();
var rp = require("request-promise");

/* GET users listing. */
router.get("/", function(req, res, next) {
  let authorization = req.headers.authorization;
  // https://fantasysports.yahooapis.com/fantasy/v2/league/

  rp({
    uri: "https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1//",
    headers: {
      Authorization: req.headers.authorization
    }
  }).then(function (response) {
    console.log(response);
    res.send(response);
  })
  .catch(function (err) {
    console.log(err);
    res.send("Error requesting yahoo API");
  });


  });

module.exports = router;

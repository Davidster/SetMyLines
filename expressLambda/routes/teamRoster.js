const path = require("path");
const express = require("express");
const router = express.Router();
const moment = require("moment-timezone");
const asyncMiddleware = require("./asyncMiddleware");
const { requester, verifyIDToken } = require(path.join(process.env.COMMON_PATH, "requester"));
const { fetchAndOptimizeLineup } = require(path.join(process.env.COMMON_PATH, "fetchAndOptimizeLineup"));
const rosterToXML = require(path.join(process.env.COMMON_PATH, "rosterToXML"));

router.get("/", asyncMiddleware(async (req, res, next) => {
  try {
    let lineups = await fetchAndOptimizeLineup(req.query.teamKey, req.query.date, JSON.parse(req.cookies.accessToken), res);
    res.json(lineups);
  } catch(err) {
    console.log(err);
    return res.status(500).send();
  }
}));

router.put("/", asyncMiddleware(async (req, res, next) => {
  if(!req.query.teamKey) {
    throw new Error("Missing request body param: teamKey");
  }
  if(!req.body.roster) {
    throw new Error("Missing request body param: roster");
  }
  if(!req.query.date) {
    req.query.date = moment().tz("America/New_York").format("YYYY-MM-DD");
  }
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);
  try {
    let rpOptions = {
      method: "PUT",
      body: rosterToXML(req.body.roster, req.query.date),
      headers: { "Content-Type": "application/xml" }
    };
    await requester(`team/${req.query.teamKey}/roster`, rpOptions, accessToken, res);
    res.json({});
  } catch (err) {
    console.log(err);
    throw new Error("Error updating roster");
  }
}));

module.exports = router;

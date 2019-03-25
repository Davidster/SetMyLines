const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const { verifyIDToken } = require(path.join(process.env.COMMON_PATH, "requester"));
const userDAO = require(path.join(process.env.COMMON_PATH, "userDAO"));

router.get("/", asyncMiddleware(async (req, res, next) => {
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);
  try {
    let subscriptionMap = await userDAO.getSubscriptions(userInfo.sub);
    res.json(subscriptionMap);
  } catch (err) {
    console.log(err);
    throw new Error("Error getting subscriptions");
  }
}));

router.post("/", asyncMiddleware(async (req, res, next) => {
  if(!req.body.teamKey) {
    throw new Error("Missing request body param: teamKey");
  }
  if(!req.body.stat) {
    throw new Error("Missing request body param: stat");
  }
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);
  try {
    await userDAO.putSubscription(userInfo.sub, accessToken, req.body.teamKey, req.body.stat);
    res.json({});
  } catch (err) {
    console.log(err);
    throw new Error("Error adding subscription");
  }
}));

router.delete("/", asyncMiddleware(async (req, res, next) => {
  if(!req.body.teamKey) {
    throw new Error("Missing request body param: teamKey");
  }
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);
  try {
    await userDAO.deleteSubscription(userInfo.sub, accessToken, req.body.teamKey, req.body.stat);
    res.json({});
  } catch (err) {
    console.log(err);
    throw new Error("Error adding subscription");
  }
}))

module.exports = router;

const path = require("path");
const express = require("express");
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: true });
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const { emailVerificationLink } = require(path.join(process.env.COMMON_PATH, "user/emailer"));
const userDAO = require(path.join(process.env.COMMON_PATH, "user/userDAO"));
const { verifyIDToken } = require(path.join(process.env.COMMON_PATH, "yahoo/requester"));

router.get("/", csrfProtection, asyncMiddleware(async (req, res, next) => {
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);
  try {
    let email = await userDAO.getEmail(userInfo.sub);
    if(email) {
      res.json({
        address: email.address,
        isVerified: email.isVerified
      });
    } else {
      res.json({});
    }
  } catch (err) {
    console.log(err);
    throw new Error("Error getting email");
  }
}));

router.post("/register", csrfProtection, asyncMiddleware(async (req, res, next) => {
  if(!req.body.email) {
    throw new Error("Missing request body param: email");
  }
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);
  try {
    let emailAlreadyVerified = await userDAO.putEmail(userInfo.sub, req.body.email);
    if(!emailAlreadyVerified) {
      let userItem = await userDAO.getFullUserItem(userInfo.sub);
      await emailVerificationLink(userItem.email.address, userItem.userID, userItem.email.verificationCode);
    }
    res.json({ emailAlreadyVerified: emailAlreadyVerified });
  } catch (err) {
    console.log(err);
    throw new Error("Error adding email");
  }
}));

router.post("/enable", asyncMiddleware(async (req, res, next) => {
  if(!req.body.userID || !req.body.verificationCode || req.body.enable === undefined) {
    return res.status(400).send();
  }
  try {
    let userItem = await userDAO.getFullUserItem(req.body.userID);
    if(userItem.email.verificationCode !== req.body.verificationCode) {
      return res.status(400).send();
    }
    await userDAO.enableEmail(userItem.userID, (req.body.enable === "true" || req.body.enable === true));
    res.json({});
  } catch (err) {
    console.log(err);
    throw new Error("Error enabling/disabling email");
  }
}));

router.post("/verify", asyncMiddleware(async (req, res, next) => {
  if(!req.body.userID || !req.body.verificationCode) {
    return res.status(400).send();
  }
  let verified = await userDAO.verifyEmail(req.body.userID, req.body.verificationCode);
  if(!verified) {
    return res.status(400).send();
  }
  res.json({});
}));

module.exports = router;

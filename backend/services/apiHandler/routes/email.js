const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const userDAO = require(path.join(process.env.LIB_PATH, "user/userDAO"));

router.post("/unsubscribe", asyncMiddleware(async (req, res, next) => {
  if(!req.body.userID || !req.body.verificationCode) {
    return res.status(400).send();
  }
  try {
    let userItem = await userDAO.getFullUserItem(req.body.userID);
    if(userItem.email.verificationCode !== req.body.verificationCode) {
      return res.status(400).send();
    }
    await userDAO.enableEmail(userItem.userID, false);
    res.json({});
  } catch (err) {
    console.log(err);
    throw new Error("Error unsubscribing user from emails");
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

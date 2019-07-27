const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const { emailVerificationLink } = require(path.join(process.env.LIB_PATH, "user/emailer"));
const userDAO = require(path.join(process.env.LIB_PATH, "user/userDAO"));
const { verifyIDToken } = require(path.join(process.env.LIB_PATH, "yahoo/requester"));

router.get("/", asyncMiddleware(async (req, res, next) => {
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);
  try {
    let response = {};
    let emailItem = await userDAO.getEmail(userInfo.sub);
    if(emailItem) {
      response.email = {
        address: emailItem.address,
        isVerified: emailItem.isVerified
      };
    }
    res.json(response);
  } catch (err) {
    console.log(err);
    throw new Error("Error getting settings");
  }
}));

router.put("/", asyncMiddleware(async (req, res, next) => {
  let accessToken = JSON.parse(req.cookies.accessToken);
  let userInfo = await verifyIDToken(accessToken.id_token);

  try {
    let response = {};
    const { emailAddress } = req.body;

    if(emailAddress) {
      let emailItem = await registerEmailAddress(userInfo.sub, emailAddress);
      response.email = {
        address: emailItem.address,
        isVerified: emailItem.isVerified
      };
    }

    res.json(response);
  } catch (err) {
    console.log(err);
    throw new Error("Error updating settings");
  }
}));

const registerEmailAddress = async (userID, emailAddress) => {
  try {
    let emailItem = await userDAO.putEmail(userID, emailAddress);
    if(!emailItem.isVerified) {
      await emailVerificationLink(emailItem.address, userID, emailItem.verificationCode);
    }
    return emailItem;
  } catch (err) {
    console.log(err);
    throw new Error("Error adding email address");
  }
};

module.exports = router;
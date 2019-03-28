const path = require("path");
const moment = require("moment-timezone");

// set environment variables defined in lambda layer
require(path.join(process.env.COMMON_PATH, "setupEnvironment"));

const { performRosterUpdate } = require("./automaticRosterUpdater");
const userDAO = require(path.join(process.env.COMMON_PATH, "user/userDAO"));
const { sendEmailNotifications } = require(path.join(process.env.COMMON_PATH, "user/emailer"));

exports.handler = async (event, context, callback) => {
  try {
    let date = moment().tz("America/New_York").format("YYYY-MM-DD");
    // date = "2019-03-29";
    let users = await userDAO.getAllUsers();
    let subscribedUsers = users.filter(user => {
      return user &&
             user.accessToken &&
             user.subscriptionMap &&
             Object.keys(user.subscriptionMap).length > 0;
    });
    let userRosterUpdateResults = await Promise.all(subscribedUsers.map(user=>performRosterUpdate(user, date)));
    console.log("rosterUpdateResults:", userRosterUpdateResults.map(user => {
      let newResult = { userID: user.user.userID };
      Object.keys(user.rosterUpdateResults).filter(key=>key!=="userID").forEach(key => {
        newResult[key] = !!user[key];
      })
      return newResult;
    }));
    let userRosterUpdateEmailResults = await sendEmailNotifications(userRosterUpdateResults);
    console.log("userRosterUpdateEmailResults:", userRosterUpdateEmailResults);
    callback(null);
  } catch(err) {
    console.log(`Critical error running subscription lambda:`, err);
    callback(err);
  }

};

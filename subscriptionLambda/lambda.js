const path = require("path");
const moment = require("moment-timezone");

// set environment variables defined in lambda layer
require(path.join(process.env.COMMON_PATH, "setupEnvironment"));

const { requester, verifyIDToken, refreshTokenIfNeeded } = require(path.join(process.env.COMMON_PATH, "requester"));
const { fetchAndOptimizeLineup } = require(path.join(process.env.COMMON_PATH, "fetchAndOptimizeLineup"));
const userDAO = require(path.join(process.env.COMMON_PATH, "userDAO"));
const rosterToXML = require(path.join(process.env.COMMON_PATH, "rosterToXML"));

let performRosterUpdate = async (user, date) => {
  console.log(`Performing roster update for user: ${user.userID}`);
  let teamKeys = Object.keys(user.subscriptionMap);
  let results = { userID: user.userID };

  let accessToken;
  try {
    accessToken = await refreshTokenIfNeeded(user.accessToken);
  } catch (err) {
    console.log(`Error autorefreshing token for user: ${user.userID}:`, err);
    return results;
  }

  for(let j = 0; j < teamKeys.length; j++) {
    let teamKey = teamKeys[j];
    let stat = user.subscriptionMap[teamKey];
    let lineups;

    try {
      lineups = await fetchAndOptimizeLineup(teamKey, date, accessToken);
    } catch (err) {
      console.log(`Error fetching/optimizing lineup for user: ${user.userID}, teamKey: ${teamKey}:`, err);
      results[teamKey] = false;
      continue;
    }

    console.log(`Done roster optmiziation for user: ${user.userID}`);

    try {
      let newRoster = lineups.optimizedLineups[stat].map(player => ({
        playerKey: lineups.playerInfoMap[player.name].key,
        position: player.position
      }));
      let rpOptions = {
        method: "PUT",
        body: rosterToXML(newRoster, date),
        headers: { "Content-Type": "application/xml" }
      };
      await requester(`team/${teamKey}/roster`, rpOptions, accessToken);
    } catch (err) {
      console.log(`Error sending PUT lineup request to yahoo for user: ${user.userID}, teamKey: ${teamKey}:`, (err.message ? err.message : err));
      results[teamKey] = false;
      continue;
    }
    console.log(`Done roster PUT for user: ${user.userID}`);
    results[teamKey] = true;
  }
  return results;
};

exports.handler = async (event, context, callback) => {
  try {
    let date = moment().tz("America/New_York").format("YYYY-MM-DD");
    let users = await userDAO.getAllUsers();
    let rosterUpdateResults = await Promise.all(users.map(user=>performRosterUpdate(user, date)));
    console.log("rosterUpdateResults:", rosterUpdateResults);
  } catch(err) {
    console.log(`Critical error running subscription lambda:`, err);
  }
  callback(null);
};

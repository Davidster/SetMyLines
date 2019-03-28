const path = require("path");
const { requester, verifyIDToken, refreshTokenIfNeeded } = require(path.join(process.env.COMMON_PATH, "yahoo/requester"));
const { fetchAndOptimizeLineup } = require(path.join(process.env.COMMON_PATH, "yahoo/fetchAndOptimizeLineup"));
const rosterToXML = require(path.join(process.env.COMMON_PATH, "yahoo/rosterToXML"));
const { parseTeamDoc } = require(path.join(process.env.COMMON_PATH, "yahoo/team"));

let optimizeTeam = async (user, teamKey, date, accessToken, verbose) => {
  let stat = user.subscriptionMap[teamKey];
  let lineups, newRoster;

  try {
    lineups = await fetchAndOptimizeLineup(teamKey, date, accessToken, undefined, verbose);
  } catch (err) {
    console.log(`Error fetching/optimizing lineup for user: ${user.userID}, teamKey: ${teamKey}:`, err);
    return false;
  }

  try {
    newRoster = lineups.optimizedLineups[stat].lineup.map(player => ({
      playerKey: lineups.playerInfoMap[player.name].key,
      position: player.position
    }));
    let rpOptions = {
      method: "PUT",
      body: rosterToXML(newRoster, date),
      headers: { "Content-Type": "application/xml" }
    };
    await requester(`team/${teamKey}/roster`, rpOptions, accessToken, undefined, false, false);
  } catch (err) {
    console.log(`Error sending PUT lineup request to yahoo for user: ${user.userID}, teamKey: ${teamKey}:`, (err.message ? err.message : err));
    return false
  }

  return {
    before: lineups.originalLineup,
    after: lineups.optimizedLineups[stat],
    playerInfoMap: lineups.playerInfoMap,
    aggregateStatCategories: lineups.aggregateStatCategories,
    stat: stat
  };
};

let performRosterUpdate = async (user, date, verbose = false) => {
  let teamKeys = Object.keys(user.subscriptionMap);
  let results = { user: user, rosterUpdateResults: {} };

  let accessToken;
  try {
    accessToken = await refreshTokenIfNeeded(user.accessToken, undefined, verbose);
  } catch (err) {
    console.log(`Error autorefreshing token for user: ${user.userID}:`, err);
    return results;
  }

  let getUserTeamsPromise = requester("users;use_login=1/games/leagues/teams", {}, accessToken, undefined, false, verbose)
                             .then($teamDoc=>(results.teams=parseTeamDoc($teamDoc)));

  // https://www.npmjs.com/package/es6-promise-pool might be a good option to limit concurrency here.
  await Promise.all(teamKeys.map(teamKey => {
    return optimizeTeam(user, teamKey, date, accessToken, verbose)
             .then(result=>(results.rosterUpdateResults[teamKey]=result));
  }));
  await getUserTeamsPromise;

  return results;
};

module.exports.performRosterUpdate = performRosterUpdate;

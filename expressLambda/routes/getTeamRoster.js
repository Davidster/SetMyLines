var express = require("express");
var router = express.Router();
const rp = require("request-promise");
const moment = require("moment");
const { requester, refreshTokenIfNeeded } = require("../requester");
const { parseNhlDailySchedule } = require("../parsers/nhlDailySchedule");
const { parseTeamRoster,
        parsePlayerStats,
        parseGameSettings,
        parseLeagueSettings } = require("../parsers/roster");
const { optimizeLineupByAttribute } = require("../lineOptimizer");

const NHL_DAILY_SCHEDULE_URL = "https://statsapi.web.nhl.com/api/v1/schedule";

let batchPlayerStatsRequests = (playerKeys, accessToken, res) => {
  // Yahoo seems to only allow 25 players per request. put max at 20 to be safe
  let playersPerBatch = 20;
  let batches = Math.ceil(playerKeys.length / playersPerBatch);
  let batchPromises = [];
  for(let batch = 0; batch < batches; batch++) {
    let playerBatch = playerKeys.slice(batch * playersPerBatch, (batch + 1) * playersPerBatch);
    let playersStatsQuery = `players;player_keys=${playerBatch.join(",")}/stats`;
    batchPromises.push(requester(playersStatsQuery, accessToken, res));
  }
  return batchPromises;
};

router.get("/", async (req, res, next) => {
  // parse request
  let accessToken = JSON.parse(req.cookies.accessToken);
  let date = undefined || moment().format("YYYY-MM-DD");

  // define yahoo queries
  let dailyScheduleReq = { url: `${NHL_DAILY_SCHEDULE_URL}?date=${date}` };
  let teamKey = req.query.teamKey;
  let teamRosterQuery = `team/${teamKey}/roster;date=${date}`;
  let leagueKey = teamKey.split(".").slice(0,3).join(".");
  let leagueSettingsQuery = `league/${leagueKey}/settings`;
  let gameKey = teamKey.split(".")[0];
  let gameSettingsQuery = `game/${gameKey}/stat_categories`;

  let allPlayerInfo, optimizationResults = {};
  try {
    // perform yahoo queries
    let playerInfoSub = {};
    accessToken = await refreshTokenIfNeeded(accessToken, res);
    let requests = await Promise.all([
      requester(teamRosterQuery, accessToken, res).then($trDoc => {
        playerInfoSub = parseTeamRoster($trDoc);
        return Promise.all(batchPlayerStatsRequests(Object.keys(playerInfoSub), accessToken, res));
      }),
      rp(dailyScheduleReq),
      requester(gameSettingsQuery, accessToken, res),
      requester(leagueSettingsQuery, accessToken, res)
    ]);

    // parse query results
    let dailyGameMap = parseNhlDailySchedule(JSON.parse(requests[1]));
    let statIDMap = parseGameSettings(requests[2]);
    parseLeagueSettings(requests[3], statIDMap);
    allPlayerInfo = parsePlayerStats(requests[0], playerInfoSub, statIDMap, dailyGameMap);

    let aggregateStatCategories = [
      "averageFanPoints",
      "totalFanPoints"
    ];
    for(let i = 0; i < aggregateStatCategories.length; i++) {
      let category = aggregateStatCategories[i];
      optimizationResult = await optimizeLineupByAttribute(allPlayerInfo, category, false);
      optimizationResults[category] = optimizationResult;
    }

  } catch (err) {
    console.log("Error getting team roster:", err);
    return res.status(500).send();
  }

  // return results to client
  res.send(JSON.stringify({
    players: allPlayerInfo,
    optimizationResults: optimizationResults
  }));
});

module.exports = router;

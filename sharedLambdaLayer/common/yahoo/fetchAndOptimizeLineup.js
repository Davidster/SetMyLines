const rp = require("request-promise");
const moment = require("moment-timezone");
const { requester, refreshTokenIfNeeded, verifyIDToken } = require("./requester");
const { parseNhlDailySchedule } = require("./nhlDailySchedule");
const { parseTeamRoster,
        parsePlayerStats,
        parseGameSettings,
        parseLeagueSettings } = require("./roster");
const { optimizeLineupByAttribute } = require("./lineOptimizer");
const NHL_DAILY_SCHEDULE_URL = "https://statsapi.web.nhl.com/api/v1/schedule";

const aggregateStatCategories = [
  {
    name: "averageFanPoints",
    prettyName: "Average fan points per game",
    prettyNameShort: "AFP"
  },
  {
    name: "totalFanPoints",
    prettyName: "Total fan points",
    prettyNameShort: "TFP"
  }
];

let batchPlayerStatsRequests = (playerKeys, accessToken, res, verbose) => {
  // Yahoo seems to only allow 25 players per request. put max at 20 to be safe
  let playersPerBatch = 20;
  let batches = Math.ceil(playerKeys.length / playersPerBatch);
  let batchPromises = [];
  for(let batch = 0; batch < batches; batch++) {
    let playerBatch = playerKeys.slice(batch * playersPerBatch, (batch + 1) * playersPerBatch);
    let playersStatsQuery = `players;player_keys=${playerBatch.join(",")}/stats`;
    batchPromises.push(requester(playersStatsQuery, {}, accessToken, res, false, verbose));
  }
  return batchPromises;
};

let simplePlayerMapping = player => ({
  position: player.currentPosition,
  name: player.name,
  moved: player.moved
});

let addStatTotals = resultObject => {
  let originalLineup = resultObject.originalLineup;
  let optimizedLineups = resultObject.optimizedLineups;
  let playerInfoMap = resultObject.playerInfoMap;
  let aggregateStatAttribs = aggregateStatCategories.map(category=>category.name);

  originalLineup.statTotals = {};
  aggregateStatAttribs.forEach(attrib => {
    optimizedLineups[attrib].statTotals = {};
  });
  aggregateStatAttribs.forEach(attrib => {
    let emptyStructure = () => ({
      healthy: { value: 0 },
      unhealthy: { value: 0 }
    });
    originalLineup.statTotals[attrib] = emptyStructure();
    aggregateStatAttribs.forEach(attribSub => {
      optimizedLineups[attrib].statTotals[attribSub] = emptyStructure();
    });
  });
  originalLineup.lineup.forEach(player => {
    let playerInfo = playerInfoMap[player.name];
    if(playerInfo && player.position !== "BN" && !!playerInfo.todaysGame) {
      let isHealthy = !!playerInfo.status ? "unhealthy" : "healthy";
      aggregateStatAttribs.forEach(attrib => {
        originalLineup.statTotals[attrib][isHealthy].value += playerInfo.aggregateStats[attrib];
      });
    }
  });
  aggregateStatAttribs.forEach(attrib => {
    let lineup = optimizedLineups[attrib].lineup;
    lineup.forEach(player => {
      let playerInfo = playerInfoMap[player.name];
      if(playerInfo && player.position !== "BN" && !!playerInfo.todaysGame) {
        let isHealthy = !!playerInfo.status ? "unhealthy" : "healthy";
        aggregateStatAttribs.forEach(attribSub => {
          optimizedLineups[attrib].statTotals[attribSub][isHealthy].value += playerInfo.aggregateStats[attribSub];
        });
      }
    });
  });
  let originalStatTotals = originalLineup.statTotals;
  aggregateStatAttribs.forEach(attrib => {
    let optimizedStatTotals = optimizedLineups[attrib].statTotals;
    let healthyOrig = originalStatTotals[attrib].healthy.value;
    let unhealthyOrig = originalStatTotals[attrib].unhealthy.value;
    originalStatTotals[attrib].total = { value: (healthyOrig + unhealthyOrig) };
    aggregateStatAttribs.forEach(attribSub => {
      let healthyOrig = originalStatTotals[attribSub].healthy.value;
      let unhealthyOrig = originalStatTotals[attribSub].unhealthy.value;
      let totalOrig = healthyOrig + unhealthyOrig;
      let unhealthyOpt = optimizedStatTotals[attribSub].unhealthy.value;
      let healthyOpt = optimizedStatTotals[attribSub].healthy.value;
      let totalOpt = unhealthyOpt + healthyOpt;
      optimizedStatTotals[attribSub].healthy.diff = 100 * (healthyOpt - healthyOrig) / (healthyOrig + 0.0001);
      optimizedStatTotals[attribSub].unhealthy.diff = 100 * (unhealthyOpt - unhealthyOrig) / (unhealthyOrig + 0.0001);
      optimizedStatTotals[attribSub].total = {
        value: totalOpt,
        diff: 100 * (totalOpt - totalOrig) / (totalOrig + 0.0001)
      };
    });
  });
};

module.exports.fetchAndOptimizeLineup = async (teamKey, date, accessToken, expressResponse, verbose = true) => {
  date = date || moment().tz("America/New_York").format("YYYY-MM-DD");

  // define yahoo queries
  let dailyScheduleReq = { url: `${NHL_DAILY_SCHEDULE_URL}?date=${date}` };
  let teamRosterQuery = `team/${teamKey}/roster;date=${date}`;
  let leagueKey = teamKey.split(".").slice(0,3).join(".");
  let leagueSettingsQuery = `league/${leagueKey}/settings`;
  let gameKey = teamKey.split(".")[0];
  let gameSettingsQuery = `game/${gameKey}/stat_categories`;

  let statIDMap = {}, optimizedLineups = {}, playerInfoMap = {}, originalLineup = [], requests = [];
  try {
    // fire nhl daily schedule request first since we don't need the access token
    let nhlDailyScheduleReqPromise = rp(dailyScheduleReq);

    // prepare access token
    let tokenCheckResults = await Promise.all([
      verifyIDToken(accessToken.id_token),
      refreshTokenIfNeeded(accessToken, expressResponse)
    ]);
    accessToken = tokenCheckResults[1];

    // perform yahoo queries
    let playerInfoSub = {};

    requests = await Promise.all([
      requester(teamRosterQuery, {}, accessToken, expressResponse, false, verbose).then($trDoc => {
        playerInfoSub = parseTeamRoster($trDoc);
        return Promise.all(batchPlayerStatsRequests(Object.keys(playerInfoSub), accessToken, expressResponse, verbose));
      }),
      nhlDailyScheduleReqPromise,
      requester(gameSettingsQuery, {}, accessToken, expressResponse, false, verbose),
      requester(leagueSettingsQuery, {}, accessToken, expressResponse, false, verbose),
    ]);

    // parse query results
    let dailyGameMap = parseNhlDailySchedule(JSON.parse(requests[1]));
    statIDMap = parseGameSettings(requests[2]);
    let positionCapacityMap = {};
    // this function mutates the statIDMap and positionCapacityMap objects
    parseLeagueSettings(requests[3], statIDMap, positionCapacityMap);
    let allPlayerInfo = parsePlayerStats(requests[0], playerInfoSub, statIDMap, dailyGameMap);

    // optimize linuep against some stat categories
    for(let i = 0; i < aggregateStatCategories.length; i++) {
      let category = aggregateStatCategories[i].name;
      let optimizedLineup = await optimizeLineupByAttribute(allPlayerInfo, category, positionCapacityMap, verbose);
      optimizedLineups[category] = {
        lineup: optimizedLineup.map(simplePlayerMapping)
      }
    }

    // format output
    playerInfoMap = allPlayerInfo.reduce((acc, player) => {
      acc[player.name] = player;
      return acc;
    }, {});
    originalLineup = {
      lineup: allPlayerInfo.map(simplePlayerMapping)
    }
  } catch (err) {
    console.log("Error getting team roster:", err);
    console.log("Raw Yahoo responses:");
    console.log("player stats document:", requests[0] && requests[0].html());
    console.log("nhl daily schedule document:", requests[1] && requests[1].html());
    console.log("game settings document:", requests[2] && requests[2].html());
    console.log("league settings document:", requests[3] && requests[3].html());
    throw new Error("Error fetching/optimizing linuep");
  }

  let result = {
    playerInfoMap: playerInfoMap,
    originalLineup: originalLineup,
    optimizedLineups: optimizedLineups,
    statIDMap: statIDMap,
    aggregateStatCategories: aggregateStatCategories
  };
  addStatTotals(result);

  return result;
};

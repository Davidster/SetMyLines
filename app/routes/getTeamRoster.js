var express = require("express");
var router = express.Router();
const rp = require("request-promise");
const requester = require("../requester");
const moment = require("moment");

const NHL_DAILY_SCHEDULE_URL = "https://statsapi.web.nhl.com/api/v1/schedule";

let processDailyGames = (gmDoc) => {
  let dailyGameMap = {};
  gmDoc.dates[0].games.forEach(game => {
    // all teams have the same non-abbreviated name across nhl and yahoo except the montreal canadiens... see branch yahooVsNhlTeamNames
    let homeTeam = game.teams.home.team.name.replace("é", "e");
    let awayTeam = game.teams.away.team.name.replace("é", "e");
    dailyGameMap[homeTeam] = {
      gameDate: game.gameDate,
      opponent: awayTeam
    };
    dailyGameMap[awayTeam] = {
      gameDate: game.gameDate,
      opponent: homeTeam
    };
  });
  return dailyGameMap;
};

let processGameSettings = ($gsDoc) => {
  let statIDMap = {};
  let $statModifiers = $gsDoc("stat_modifiers stat");
  $gsDoc("stat_categories stat").each((i, statCategory) => {
    let $statCategory = $gsDoc(statCategory);
    statIDMap[$statCategory.find("stat_id").first().text()] = {
      name: $statCategory.find("name").text(),
      displayName: $statCategory.find("display_name").text(),
      posTypes: $statCategory.find("position_types > position_type").map((i,position)=>$gsDoc(position).text()).get()
    };
  });
  return statIDMap;
};

let processLeagueSettings = ($lsDoc, statIDMap) => {
  let $statModifiers = $lsDoc("stat_modifiers stat");
  $lsDoc("stat_categories stat").each((i, statCategory) => {
    let $statCategory = $lsDoc(statCategory);
    let statID = $statCategory.find("stat_id").text();
    $statModifiers.each((i, statModifier) => {
      let $statModifier = $lsDoc(statModifier);
      if(statID === $statModifier.find("stat_id").text()) {
        statValue = $statModifier.find("value").text();
      }
    });
    statIDMap[statID] = {
      ...statIDMap[statID],
      enabled: $statCategory.find("enabled").text(),
      fanPointsPerUnit: statValue
    };
  });
};

let processTeamRoster = ($trDoc) => {
  let playerInfoSub = {};
  $trDoc("player").each((i, player) =>{
    let $player = $trDoc(player);
    playerInfoSub[$player.find("player_key").text()] = {
      selectedPos: $player.find("selected_position position").text(),
      startingStatus: $player.find("starting_status > is_starting").text() || undefined
    };
  });
  return playerInfoSub;
};

let processPlayerStats = ($psDocs, playerInfoSub, statIDMap, dailyGameMap) => {
  let allPlayerInfo = [];

  // parse player info and stats
  $psDocs.forEach($psDoc => {
    $psDoc("player").each((i, player) => {

      let $player = $psDoc(player);
      let playerKey = $player.find("player_key").text();
      allPlayerInfo.push({
        ...playerInfoSub[playerKey],
        key: playerKey,
        name: $player.find("name > full").text(),
        team: $player.find("editorial_team_full_name").text(),
        status: $player.find("status").text() || undefined,
        imageUrl: $player.find("image_url").text() || undefined,
        eligiblePosList: $player.find("eligible_positions > position").map((i,position)=>$psDoc(position).text()).get(),
        stats: $player.find("stats > stat").map((i, stat) => {
          let $stat = $psDoc(stat);
          let statID = $stat.find("stat_id").text();
          return {
            id: statID,
            name: statIDMap[statID].name,
            displayName: statIDMap[statID].displayName,
            enabled: statIDMap[statID].enabled,
            posTypes: statIDMap[statID].posTypes,
            fanPointsPerUnit: statIDMap[statID].fanPointsPerUnit,
            count: $stat.find("value").text()
          };
        }).get()
      });
    });
  });

  // compute fan point values from stats
  allPlayerInfo = allPlayerInfo.map(playerInfo => {
    let totalFps = calculateTotalFps(playerInfo);
    let averageFps = totalFps / playerInfo.stats.filter(stat=>stat.displayName==="GP")[0].count;
    return {
      ...playerInfo,
      totalFanPoints: totalFps,
      averageFanPoints: averageFps,
      todaysGame: dailyGameMap[playerInfo.team]
    };
  });

  return allPlayerInfo;
};

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

let calculateTotalFps = (playerInfo) => {
  return playerInfo.stats.reduce((acc, stat) => {
    if(stat.enabled === "1") {
      return acc + stat.count * stat.fanPointsPerUnit;
    }
    return acc;
  }, 0);
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

  try {
    // perform yahoo queries
    let playerInfoSub = {};
    let requests = await Promise.all([
      requester(teamRosterQuery, accessToken, res).then($trDoc => {
        playerInfoSub = processTeamRoster($trDoc);
        return Promise.all(batchPlayerStatsRequests(Object.keys(playerInfoSub), accessToken, res));
      }),
      rp(dailyScheduleReq),
      requester(gameSettingsQuery, accessToken, res),
      requester(leagueSettingsQuery, accessToken, res)
    ]);

    // process query results
    let dailyGameMap = processDailyGames(JSON.parse(requests[1]));
    let statIDMap = processGameSettings(requests[2]);
    processLeagueSettings(requests[3], statIDMap);
    allPlayerInfo = processPlayerStats(requests[0], playerInfoSub, statIDMap, dailyGameMap);

  } catch (err) {
    console.log("Error getting team roster:", err);
    return res.status(500).send();
  }

  // return results to client
  res.send(JSON.stringify(allPlayerInfo));
});

module.exports = router;

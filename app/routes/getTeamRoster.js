var express = require("express");
var router = express.Router();
const rp = require("request-promise");
const requester = require("../requester");
const moment = require("moment");

const NHL_DAILY_SCHEDULE_URL = "https://statsapi.web.nhl.com/api/v1/schedule";
const NHL_TEAMS_URL = "https://statsapi.web.nhl.com/api/v1/teams";

let processDailyGames = (gmDoc, teamDoc) => {
  let dailyGameMap = {};
  gmDoc.dates[0].games.forEach(game => {
    let homeTeamAbbr, awayTeamAbbr;
    teamDoc.teams.forEach(team => {
      if(team.name === game.teams.home.team.name) {
        homeTeamAbbr = team.abbreviation;
      }
      if(team.name === game.teams.away.team.name) {
        awayTeamAbbr = team.abbreviation;
      }
    });
    console.log(homeTeamAbbr);
    console.log(awayTeamAbbr);
    dailyGameMap[homeTeamAbbr] = {
      gameDate: game.gameDate,
      opponent: awayTeamAbbr
    };
    dailyGameMap[awayTeamAbbr] = {
      gameDate: game.gameDate,
      opponent: homeTeamAbbr
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
      statName: $statCategory.find("name").first().text(),
      statDisplayName: $statCategory.find("display_name").first().text(),
      statPositionTypes: $statCategory.find("position_types > position_type").map((i,position)=>$gsDoc(position).text()).get()
    };
  });
  return statIDMap;
};

let processLeagueSettings = ($lsDoc, statIDMap) => {
  let $statModifiers = $lsDoc("stat_modifiers stat");
  $lsDoc("stat_categories stat").each((i, statCategory) => {
    let $statCategory = $lsDoc(statCategory);
    let statID = $statCategory.find("stat_id").first().text();
    $statModifiers.each((i, statModifier) => {
      let $statModifier = $lsDoc(statModifier);
      if(statID === $statModifier.find("stat_id").first().text()) {
        statValue = $statModifier.find("value").first().text();
      }
    });
    statIDMap[statID] = {
      ...statIDMap[statID],
      statEnabled: $statCategory.find("enabled").first().text(),
      statValue: statValue
    };
  });
};

let processTeamRoster = ($trDoc) => {
  let playerPositions = {};
  $trDoc("player").each((i, player) =>{
    let $player = $trDoc(player);
    playerPositions[$player.find("player_key").first().text()] = $player.find("selected_position position").first().text();
  });
  return playerPositions;
};

let processPlayerStats = ($psDocs, playerPositions, statIDMap, dailyGameMap) => {
  let allPlayerInfo = [];

  // parse player info and stats
  console.log();
  $psDocs.forEach($psDoc => {
    // console.log($psDoc.html());
    $psDoc("player").each((i, player) => {
      let $player = $psDoc(player);
      let playerKey = $player.find("player_key").first().text();
      console.log($player.find("editorial_team_abbr").first().text().toUpperCase());
      allPlayerInfo.push({
        playerKey: playerKey,
        playerSelectedPosition: playerPositions[playerKey],
        playerName: $player.find("name > full").first().text(),
        playerTeam: $player.find("editorial_team_full_name").first().text(),
        playerTeamShort: $player.find("editorial_team_abbr").first().text().toUpperCase(),
        playerStatus: $player.find("status").first().text(),
        playerImageUrl: $player.find("image_url").first().text(),
        playerStartingStatus: $player.find("starting_status > is_starting").first().text(),
        playerEligiblePositions: $player.find("eligible_positions > position").map((i,position)=>$psDoc(position).text()).get(),
        playerStats: $player.find("stats > stat").map((i, stat) => {
          let $stat = $psDoc(stat);
          let statID = $stat.find("stat_id").first().text();
          return {
            statID: statID,
            statName: statIDMap[statID].statName,
            statDisplayName: statIDMap[statID].statDisplayName,
            statEnabled: statIDMap[statID].statEnabled,
            statPositionTypes: statIDMap[statID].statPositionTypes,
            statFPValue: statIDMap[statID].statValue,
            statCountValue: $stat.find("value").first().text()
          };
        }).get()
      });
    });
  });

  // compute fan point values from stats
  allPlayerInfo = allPlayerInfo.map(playerInfo => {
    let totalFps = calculateTotalFps(playerInfo);
    let averageFps = totalFps / playerInfo.playerStats.filter(stat=>stat.statDisplayName==="GP")[0].statCountValue;
    return {
      ...playerInfo,
      totalFps: totalFps,
      averageFps: averageFps,
      todaysGame: dailyGameMap[playerInfo.playerTeamShort]
    };
  });

  return allPlayerInfo;
};

let batchPlayerStatsRequests = (playerPositions, accessToken, res) => {
  // Yahoo seems to only allow 25 players per request. put max at 20 to be safe
  let playerKeys = Object.keys(playerPositions);
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
  return playerInfo.playerStats.reduce((acc, stat) => {
    if(stat.statEnabled === "1") {
      return acc + stat.statCountValue * stat.statFPValue;
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
  let nhlTeamsReq = { url: NHL_TEAMS_URL };
  let teamKey = req.query.teamKey;
  let teamRosterQuery = `team/${teamKey}/roster;date=${date}`;
  let leagueKey = teamKey.split(".").slice(0,3).join(".");
  let leagueSettingsQuery = `league/${leagueKey}/settings`;
  let gameKey = teamKey.split(".")[0];
  let gameSettingsQuery = `game/${gameKey}/stat_categories`;

  try {
    // perform yahoo queries
    let playerPositions = {};
    let requests = await Promise.all([
      requester(teamRosterQuery, accessToken, res).then($trDoc => {
        playerPositions = processTeamRoster($trDoc);
        return Promise.all(batchPlayerStatsRequests(playerPositions, accessToken, res));
      }),
      rp(dailyScheduleReq),
      rp(nhlTeamsReq),
      requester(gameSettingsQuery, accessToken, res),
      requester(leagueSettingsQuery, accessToken, res)
    ]);

    // process query results
    let dailyGameMap = processDailyGames(JSON.parse(requests[1]), JSON.parse(requests[2]));
    let statIDMap = processGameSettings(requests[3]);
    processLeagueSettings(requests[4], statIDMap);
    allPlayerInfo = processPlayerStats(requests[0], playerPositions, statIDMap, dailyGameMap);
  } catch (err) {
    console.log("Error getting team roster:", err.message);
    return res.status(500).send();
  }
  // return results to client
  res.send(JSON.stringify(allPlayerInfo));
});

module.exports = router;

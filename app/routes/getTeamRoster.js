var express = require("express");
var router = express.Router();
const rp = require("request-promise");
const requester = require("../requester");
const moment = require("moment");

const NHL_DAILY_SCHEDULE_URL = "https://statsapi.web.nhl.com/api/v1/schedule";

let calculateTotalFps = (playerInfo) => {
  return playerInfo.playerStats.reduce((acc, stat) => {
    if(stat.statEnabled === "1") {
      return acc + stat.statCountValue * stat.statFPValue;
    }
    return acc;
  }, 0);
};

let fetchDailyGameMap = async (date) => {
  let response = await rp({ url: `${NHL_DAILY_SCHEDULE_URL}?date=${date}` });
  response = JSON.parse(response);
  let dailyGameMap = {};
  response.dates[0].games.forEach(game => {
    let homeTeam = game.teams.home.team.name;
    let awayTeam = game.teams.away.team.name;
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

router.get("/", async (req, res, next) => {
  let accessToken = JSON.parse(req.cookies.accessToken);
  let date = undefined || moment().format("YYYY-MM-DD");
  let teamKey = req.query.teamKey;
  let leagueKey = teamKey.split(".").slice(0,3).join(".");
  let gameKey = teamKey.split(".")[0];
  let leagueSettingsQuery = `league/${leagueKey}/settings`;
  let gameSettingsQuery = `game/${gameKey}/stat_categories`;
  let teamRosterQuery = `team/${teamKey}/roster;date=${date}`;
  let statIDMap = {}, dailyGameMap = {}, playerPositions = {}, allPlayerInfo = [];
  console.time("total");
  try {
    console.time("fetchDailyGameMap");
    dailyGameMap = await fetchDailyGameMap(date);
    console.timeEnd("fetchDailyGameMap");
    console.time("gameSettingsQuery");
    let $ = await requester(gameSettingsQuery, accessToken, res);
    console.timeEnd("gameSettingsQuery");
    if($) {
      // map stat_id to name, display_name, enabled, position_type, value
      let $statModifiers = $("stat_modifiers stat");
      $("stat_categories stat").each((i, statCategory) => {
        let $statCategory = $(statCategory);
        statIDMap[$statCategory.find("stat_id").first().text()] = {
          statName: $statCategory.find("name").first().text(),
          statDisplayName: $statCategory.find("display_name").first().text(),
          statPositionTypes: $statCategory.find("position_types > position_type").map((i,position)=>$(position).text()).get()
        };
      });
    } else {
      return;
    }
    console.time("leagueSettingsQuery");
    $ = await requester(leagueSettingsQuery, accessToken, res);
    console.timeEnd("leagueSettingsQuery");
    if($) {
      // map stat_id to name, display_name, enabled, position_type, value
      let $statModifiers = $("stat_modifiers stat");
      $("stat_categories stat").each((i, statCategory) => {
        let $statCategory = $(statCategory);
        let statID = $statCategory.find("stat_id").first().text();
        $statModifiers.each((i, statModifier) => {
          let $statModifier = $(statModifier);
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
    } else {
      return;
    }
    console.time("teamRosterQuery");
    $ = await requester(teamRosterQuery, accessToken, res);
    console.timeEnd("teamRosterQuery");
    if($) {
      $("player").each((i, player) =>{
        let $player = $(player);
        playerPositions[$player.find("player_key").first().text()] = $player.find("selected_position position").first().text();
      });
    } else {
      return;
    }
    // Yahoo seems to only allow 25 players per request. put max at 20 to be safe
    let playerKeys = Object.keys(playerPositions);
    let playersPerBatch = 20;
    let batches = Math.ceil(playerKeys.length / playersPerBatch);
    let count = 0;

    for(let batch = 0; batch < batches; batch++) {
      let playerBatch = playerKeys.slice(batch * playersPerBatch, (batch + 1) * playersPerBatch);
      let playersStatsQuery = `players;player_keys=${playerBatch.join(",")}/stats`;
      console.time("playersStatsQuery");
      $ = await requester(playersStatsQuery, accessToken, res);
      console.timeEnd("playersStatsQuery");
      if($) {
        $("player").each((i, player) => {
          let $player = $(player);
          let playerKey = $player.find("player_key").first().text();
          allPlayerInfo.push({
            playerKey: playerKey,
            playerSelectedPosition: playerPositions[playerKey],
            playerName: $player.find("name > full").first().text(),
            playerTeam: $player.find("editorial_team_full_name").first().text(),
            playerStatus: $player.find("status").first().text(),
            playerImageUrl: $player.find("image_url").first().text(),
            playerStartingStatus: $player.find("starting_status > is_starting").first().text(),
            playerEligiblePositions: $player.find("eligible_positions > position").map((i,position)=>$(position).text()).get(),
            playerStats: $player.find("stats > stat").map((i, stat) => {
              let $stat = $(stat);
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
      } else {
        return;
      }
      count += playerBatch.length;
    }
    allPlayerInfo = allPlayerInfo.map(playerInfo => {
      let totalFps = calculateTotalFps(playerInfo);
      let averageFps = totalFps / playerInfo.playerStats.filter(stat=>stat.statDisplayName==="GP")[0].statCountValue;
      return {
        ...playerInfo,
        totalFps: totalFps,
        averageFps: averageFps,
        todaysGame: dailyGameMap[playerInfo.playerTeam]
      };
    });
  } catch(err) {
    console.log("Unknown request error:", err);
    return res.status(500).send();
  }
  console.timeEnd("total");
  res.send(JSON.stringify(allPlayerInfo));
});

module.exports = router;

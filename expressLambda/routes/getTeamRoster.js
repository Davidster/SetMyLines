var express = require("express");
var router = express.Router();
const rp = require("request-promise");
const { requester, refreshTokenIfNeeded } = require("../requester");
const moment = require("moment");
const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({ apiVersion: '2015-03-31' });

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
      todaysGame: dailyGameMap[playerInfo.team],
      aggregateStats: {
        totalFanPoints: totalFps,
        averageFanPoints: averageFps,
      }
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

/*
  valueAttribute is the attribute on the player object that we wish to optimize in maxflow,
  thus it should exist on each player object. some example attributes include "averageFanPoints",
  "totalFanPoints"
*/
let runMaxFlowCalculation = async (rawPlayersArray, valueAttribute, debug = false) => {
  let playerMap = rawPlayersArray.reduce((acc, player)=>{ acc[player.name] = player; return acc; }, {});
  let filteredPlayers = rawPlayersArray.map(player => ({
    name: player.name,
    currentPosition: player.selectedPos,
    posList: player.eligiblePosList,
    value: player.aggregateStats[valueAttribute],
    hasGameToday: !!player.todaysGame,
    unhealthy: !!player.status
  })).sort((a,b)=>(b.value-a.value)).filter(player => player.currentPosition.indexOf("IR") === -1);
  // make sure goalies who are officially starting are prioritized over those who are not by marking them as unhealthy
  filteredPlayers.forEach(player => {
    if(player.posList.length === 1 && player.posList[0] === "G") {
      player.unhealthy = player.unhealthy || !playerMap[player.name].startingStatus;
    }
  });

  let totalInputValue = 0, inputLog = [];
  let totalOutputValue = 0, outputLog = [];
  let positionCapacityMap = filteredPlayers.reduce((acc, { currentPosition }) => {
    let pos = currentPosition;
    acc[pos] ? (acc[pos]++) : (acc[pos] = 1);
    return acc;
  }, {});
  let positions = Object.keys(positionCapacityMap);
  let activePositions = positions.filter(pos=>pos!=="BN");
  let outputBins = positions.reduce((acc, pos) => {
    acc[pos] = [];
    return acc;
  }, {});
  let input = positions.reduce((acc, pos) => {
    acc[pos] = filteredPlayers.filter(player=>player.currentPosition===pos);
    return acc;
  }, {});
  // add all playes without a game to the bench
  outputBins["BN"] = outputBins["BN"].concat(filteredPlayers.filter(player=>!player.hasGameToday));

  let playersWithGame = filteredPlayers.filter(player=>player.hasGameToday);
  let healthyPlayersWithGame = playersWithGame.filter(player=>!player.unhealthy);
  let unhealthyPlayersWithGame = playersWithGame.filter(player=>!!player.unhealthy);

  /*
    Find positions for which all eligible players only have
    themsevles a single eligible position.
    In this case, we can simply sort the players by value
    and put the top ones into the output bin of their position
    and the rest into the bench.
  */
  let exclusivePositions = activePositions.filter(pos => (
    !healthyPlayersWithGame.some(player => (
      player.posList.indexOf(pos) >= 0) ?
        (player.posList.length !== 1) : false
    )
  ));
  exclusivePositions.forEach(pos => {
    // healthy players get priority over unhealthy players
    let filter = (player) => (player.posList[0]===pos);
    let playersToInsert = healthyPlayersWithGame.filter(filter)
                  .concat(unhealthyPlayersWithGame.filter(filter));
    // add as many as possible till the bin is full, then add the rest to the bench
    outputBins[pos] = outputBins[pos].concat(playersToInsert.slice(0, positionCapacityMap[pos]));
    outputBins["BN"] = outputBins["BN"].concat(playersToInsert.slice(positionCapacityMap[pos], playersToInsert.length));
  });

  /*
    For positions that are not "exclusivePositions", use maxFlowMinCost
    algorithm to place eligible players into positions
  */
  let nonExclusivePositions = activePositions.filter(pos => exclusivePositions.indexOf(pos) === -1);
  // list of players with "nonExclusivePositions"
  let allNepPlayers = healthyPlayersWithGame.filter(player => {
    return player.posList.some(pos=>nonExclusivePositions.indexOf(pos)>=0);
  });
  if(allNepPlayers.length > 0) {
    inputLog.push(JSON.stringify(allNepPlayers, undefined, 2));
    inputLog.push(nonExclusivePositions);
    inputLog.push(JSON.stringify(positionCapacityMap, undefined, 2));
    let pythonInputString = await maxFlowMinCost(allNepPlayers, nonExclusivePositions, positionCapacityMap, outputBins);
    inputLog.push(pythonInputString);
  }
  // update the remaining position capacities
  positions.forEach(pos => {
    positionCapacityMap[pos] -= outputBins[pos].length;
  });

  /*
    Perform maxFlowMinCost again for unhealthy players
    We perform two separate iterations of this algo to
    ensure that an unhealthy player never takes precedence
    over a healthy one
  */
  let unhealthyNepPlayersWithGame = unhealthyPlayersWithGame.filter(player => {
    return player.posList.some(pos=>nonExclusivePositions.indexOf(pos)>=0);
  });
  if(unhealthyNepPlayersWithGame.length > 0) {
    await maxFlowMinCost(unhealthyNepPlayersWithGame, nonExclusivePositions, positionCapacityMap, outputBins);
  }

  if(debug) {
    inputLog.push("Input:");
    positions.forEach(pos => {
      inputLog.push(`  ${pos}:`);
      let players = filteredPlayers.filter(player=>player.currentPosition===pos);
      players.forEach(player => {
        inputLog.push(`    name: ${player.name}, value: ${player.value.toFixed(2)}, posList: ${player.posList.join(",")}, hasGame: ${player.hasGameToday}, unhealthy: ${player.unhealthy}`);
        if(pos !== "BN" && player.hasGameToday && !player.unhealthy) {
          totalInputValue += player.value;
        }
      });
    });

    outputLog.push("Output:");
    positions.forEach(pos => {
      outputLog.push(`  ${pos}:`);
      outputBins[pos].forEach(player => {
        outputLog.push(`    name: ${player.name}, value: ${player.value.toFixed(2)}, posList: ${player.posList.join(",")}, hasGame: ${player.hasGameToday}, unhealthy: ${player.unhealthy}`);
        if(pos !== "BN" && player.hasGameToday && !player.unhealthy) {
          totalOutputValue += player.value;
        }
      });
    });
    let percentDifference = 100 * (totalOutputValue - totalInputValue) / totalInputValue;

    console.log("Total input value:", totalInputValue);
    console.log("Total output value:", totalOutputValue);
    console.log(`Percent difference: ${percentDifference.toFixed(2)}%`);
    if(percentDifference < -0.001) {
      console.log(inputLog.join("\n"));
      console.log(outputLog.join("\n"));
    }
  }

  return outputBins;
};

/*
  Uses python script to perform max flow min cost algorithm using
  google ortools library
*/
let maxFlowMinCost = async (players, positions, positionCapacityMap, outputBins) => {
  let pythonInputString = JSON.stringify({
    players: players.map(player => ({
      name: player.name,
      posList: player.posList,
      value: player.value
    })),
    positions: positions,
    positionCapacityMap: positionCapacityMap
  });
  let playerPosMappings = await invokeMaxFlowLambda(pythonInputString).then(res=>JSON.parse(res));
  // let playerPosMappings = await runCommand(`${PYTHON_COMMAND} '${pythonInputString}'`).then(res=>JSON.parse(res));
  players.forEach(player => {
    // retrieve the assigned position from the maxFlowMinCost solution graph
    let assignedPosition = playerPosMappings[player.name] || "BN";
    outputBins[assignedPosition].push(player);
  });
  return pythonInputString;
};

let invokeMaxFlowLambda = (inputString) => {
  return new Promise((resolve, reject) => {
    let params = {
      FunctionName: process.env.MAXFLOW_LAMBDA_NAME,
      Payload: inputString
    };
    lambda.invoke(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data.Payload);
    });
  });
};

router.get("/", async (req, res, next) => {
  // parse request
  let accessToken = JSON.parse(req.cookies.accessToken);
  let date = "2019-03-07" || moment().format("YYYY-MM-DD");

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

    let aggregateStatCategories = [
      "averageFanPoints",
      "totalFanPoints"
    ];
    for(let i = 0; i < aggregateStatCategories.length; i++) {
      let category = aggregateStatCategories[i];
      optimizationResult = await runMaxFlowCalculation(allPlayerInfo, category, false);
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

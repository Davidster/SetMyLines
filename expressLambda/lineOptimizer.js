const AWS = require("aws-sdk");
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
const path = require("path");
const { exec } = require("child_process");
const MFMC_SCRIPT_PATH = path.resolve(__dirname, "../maxFlowLambda/lambda.py");

/*
  valueAttribute is the attribute on the player object that we wish to optimize in maxflow,
  thus it should exist on each player object. some example attributes include "averageFanPoints",
  "totalFanPoints"
*/
module.exports.optimizeLineupByAttribute = async (rawPlayersArray, valueAttribute, positionCapacityMap, debug = false) => {
  // clone inputs to remove side effects
  rawPlayersArray = JSON.parse(JSON.stringify(rawPlayersArray));
  positionCapacityMap = JSON.parse(JSON.stringify(positionCapacityMap));

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


  let positions = Object.keys(positionCapacityMap).filter(position=>position.indexOf("IR") === -1);
  // If the league includes a Util spot, add Util to position list of all non-goalie players
  if(positions.indexOf("Util") >= 0) {
    filteredPlayers.forEach(player => {
      if(player.posList.indexOf("G") === -1) {
        player.posList.push("Util");
      }
    });
  }
  let activePositions = positions.filter(pos=>pos!=="BN");

  let totalInputValue = 0, inputLog = [];
  let totalOutputValue = 0, outputLog = [];
  let outputBins = positions.reduce((acc, pos) => {
    acc[pos] = [];
    return acc;
  }, {});

  let playersWithGame = filteredPlayers.filter(player=>player.hasGameToday);
  let playersWithoutGame = filteredPlayers.filter(player=>!player.hasGameToday);
  let healthyPlayersWithGame = playersWithGame.filter(player=>!player.unhealthy);
  let unhealthyPlayersWithGame = playersWithGame.filter(player=>!!player.unhealthy);

  // if the league has no bench position, do nothing. just reformat the input array as a map
  if(positionCapacityMap["BN"] === undefined) {
    outputBins = filteredPlayers.reduce((acc, player) => {
      acc[player.currentPosition] = [];
      return acc;
    }, {});
    filteredPlayers.forEach(player => {
      outputBins[player.currentPosition].push(player);
    });
    return outputBins;
  }

  /*
    Add all players without a game to the bench
  */
  outputBins["BN"] = outputBins["BN"].concat(playersWithoutGame);

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
    await performMaxFlowMinCost(allNepPlayers, nonExclusivePositions, positionCapacityMap, outputBins);
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
    await performMaxFlowMinCost(unhealthyNepPlayersWithGame, nonExclusivePositions, positionCapacityMap, outputBins);
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
let performMaxFlowMinCost = async (players, positions, positionCapacityMap, outputBins) => {
  let pythonInputString = JSON.stringify({
    players: players.map(player => ({
      name: player.name,
      posList: player.posList,
      value: player.value
    })),
    positions: positions,
    positionCapacityMap: positionCapacityMap
  });
  let playerPosMappings = await invokeMaxFlowMinCostLambda(pythonInputString).then(res=>JSON.parse(res));
  players.forEach(player => {
    // retrieve the assigned position from the maxFlowMinCost solution graph
    let assignedPosition = playerPosMappings[player.name] || "BN";
    outputBins[assignedPosition].push(player);
  });
  return pythonInputString;
};

let invokeMaxFlowMinCostLambda = (inputString) => {
  if(process.env.RUN_LOCAL) {
    return invokeMaxFlowMinCostLocal(inputString);
  }
  return new Promise((resolve, reject) => {
    let params = {
      FunctionName: process.env.MAXFLOW_LAMBDA_NAME,
      Payload: inputString
    };
    lambda.invoke(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      if(data.FunctionError) {
        return reject(data.Payload);
      }
      resolve(data.Payload);
    });
  });
};

let invokeMaxFlowMinCostLocal = (inputString) => {
  return new Promise((resolve, reject) => {
    exec(`python3 ${MFMC_SCRIPT_PATH} '${inputString.replace("\'",`'\"'\"'`)}'`, (error, stdout, stderr) => {
      if (error) {
        return reject({
          stdout: stdout,
          stderr: stderr
        });
      }
      resolve(stdout);
    });
  });
};
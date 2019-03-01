
const fs = require("fs-extra");
const FlowNetwork = require("flownetwork");
const { exec } = require("child_process");

const PYTHON_COMMAND = "python maxFlowMinCost.py";

/*
  TODO: nothing ATM
*/

let runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(stdout || error);
      }
      resolve(stdout);
    });
  });
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
  }).replace("\'",`'\"'\"'`); // escape single quotes (omg ikr)
  let playerPosMappings = await runCommand(`${PYTHON_COMMAND} '${pythonInputString}'`).then(res=>JSON.parse(res));
  players.forEach(player => {
    // retrieve the assigned position from the maxFlowMinCost solution graph
    let assignedPosition = playerPosMappings[player.name] || "BN";
    outputBins[assignedPosition].push(player);
  });
  return pythonInputString;
};

let processInputFile = async (fileName) => {
  let totalInputValue = 0, inputLog = [];
  let totalOutputValue = 0, outputLog = [];
  let allPlayersRaw = await fs.readFile(fileName, "utf-8").then(fileString=>JSON.parse(fileString));
  if(!allPlayersRaw.length) {
    return;
  }
  let playerMap = allPlayersRaw.reduce((acc, player)=>{ acc[player.name] = player; return acc; }, {});
  let allPlayers = allPlayersRaw.map(player => ({
    name: player.name,
    currentPosition: player.selectedPos,
    posList: player.eligiblePosList,
    value: player.averageFanPoints,
    hasGameToday: !!player.todaysGame,
    unhealthy: !!player.status
  })).sort((a,b)=>(b.value-a.value)).filter(player => player.currentPosition.indexOf("IR") === -1);
  // make sure goalies who are officially starting are prioritized over those who are not by marking them as unhealthy
  allPlayers.forEach(player => {
    if(player.posList.length === 1 && player.posList[0] === "G") {
      player.unhealthy = player.unhealthy || !playerMap[player.name].startingStatus
    }
  });
  let positionCapacityMap = allPlayers.reduce((acc, { currentPosition }) => {
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
    acc[pos] = allPlayers.filter(player=>player.currentPosition===pos);
    return acc;
  }, {});
  // add all playes without a game to the bench
  outputBins["BN"] = outputBins["BN"].concat(allPlayers.filter(player=>!player.hasGameToday));


  let playersWithGame = allPlayers.filter(player=>player.hasGameToday);
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

  /*
    Logs...
  */

  inputLog.push("Input:");
  positions.forEach(pos => {
    inputLog.push(`  ${pos}:`);
    let players = allPlayers.filter(player=>player.currentPosition===pos);
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
};

(async () => {
  try {
    let dir = await fs.readdir("out");
    console.log(dir.length);
    for(let i = 0; i < dir.length; i++) {
      let fileName = `out/${dir[i]}`;
      console.log(fileName);
      await processInputFile(fileName);
      console.log("-------------------");
    }
  } catch (err) {
    console.log(err);
  }
})();

const fs = require("fs-extra");
const FlowNetwork = require("flownetwork");

/*
  TODO: make sure goalies who are officially starting are prioritized over those who are not. this can be
        easily done by marking the goalie as unhealthy if they are not starting
  TODO: filter away players that are placed on the IR position (not to be confused with players who have IR status)
*/

/*
  Use maximum flow, minimum cost algorithm with the help of
  the flownetwork package. See https://cs.stackexchange.com/questions/104854/placing-items-into-compatible-bucket-types-to-find-an-optimal-total-value.

  outputBins param will be mutated
*/
let maxFlowMinCost = (players, positions, positionCapacityMap, outputBins) => {
  let fn = new FlowNetwork();
  positions.forEach((pos) => {
    fn.addEdge(pos, "t", positionCapacityMap[pos], 0);
  });
  players.forEach(player => {
    fn.addEdge("s", player.name, 1, -player.value);
    player.posList.forEach((pos) => {
      fn.addEdge(player.name, pos, 1, 0);
    });
  });
  fn.maxFlowMinCost("s", "t");
  players.forEach(player => {
    // retrieve the assigned position from the maxFlowMinCost solution graph
    let assignedPosition = player.posList.filter(pos=>fn.getEdge(player.name,pos).flow===1)[0] || "BN";
    outputBins[assignedPosition].push(player);
  });
};

(async () => {
  console.time("read");
  let allPlayersRaw = await fs.readFile("playerInfo.json", "utf-8").then(fileString=>JSON.parse(fileString));
  console.timeEnd("read");
  console.time("compute");
  let playerMap = allPlayersRaw.reduce((acc, player)=>{ acc[player.name] = player; return acc; }, {});
  let allPlayers = allPlayersRaw.map(player => ({
    name: player.name,
    currentPosition: player.selectedPos,
    posList: player.eligiblePosList,
    value: player.averageFanPoints,
    hasGameToday: !!player.todaysGame,
    unhealthy: !!player.status
  })).sort((a,b)=>(b.value-a.value));
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
    maxFlowMinCost(allNepPlayers, nonExclusivePositions, positionCapacityMap, outputBins);
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
    maxFlowMinCost(unhealthyNepPlayersWithGame, nonExclusivePositions, positionCapacityMap, outputBins);
  }

  console.timeEnd("compute");

  /*
    Logs...
  */

  let totalInputValue = 0, inputLog = [];
  inputLog.push("Input:");
  positions.forEach(pos => {
    inputLog.push(`  ${pos}:`);
    let players = allPlayers.filter(player=>player.currentPosition===pos);
    players.forEach(player => {
      inputLog.push(`    name: ${player.name}, value: ${player.value.toFixed(2)}, posList: ${player.posList.join(",")}, hasGame: ${player.hasGameToday}, unhealthy: ${player.unhealthy}`);
      if(pos !== "BN" && player.hasGameToday) {
        totalInputValue += player.value;
      }
    });
  });
  let totalOutputValue = 0, outputLog = [];
  outputLog.push("Output:");
  positions.forEach(pos => {
    outputLog.push(`  ${pos}:`);
    outputBins[pos].forEach(player => {
      outputLog.push(`    name: ${player.name}, value: ${player.value.toFixed(2)}, posList: ${player.posList.join(",")}, hasGame: ${player.hasGameToday}, unhealthy: ${player.unhealthy}`);
      if(pos !== "BN" && player.hasGameToday) {
        totalOutputValue += player.value;
      }
    });
  });
  console.log(inputLog.join("\n"));
  console.log(outputLog.join("\n"));
  console.log("Total input value:", totalInputValue);
  console.log("Total output value:", totalOutputValue);
})();

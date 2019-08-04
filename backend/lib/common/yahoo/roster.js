module.exports.parseGameSettings = ($gsDoc) => {
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

// TODO: don't use pass by reference
module.exports.parseLeagueSettings = ($lsDoc, statIDMap, positionCapacityMap) => {
  let gameCode = $lsDoc("game_code").first().text();
  let scoringType = $lsDoc("scoring_type").first().text();
  let $statModifiers = $lsDoc("stat_modifiers stat");
  $lsDoc("stat_categories stat").each((i, statCategory) => {
    let $statCategory = $lsDoc(statCategory);
    let statID = $statCategory.find("stat_id").text();
    let statValue = 0;
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
  $lsDoc("roster_positions roster_position").each((i, rosterPosition) => {
    let $rosterPosition = $lsDoc(rosterPosition);
    positionCapacityMap[$rosterPosition.find("position").text()] = parseInt($rosterPosition.find("count").text());
  });
  return { 
    gameCode,
    scoringType
  };
};

module.exports.parseTeamRoster = ($trDoc) => {
  let playerInfoSub = {};
  $trDoc("player").each((i, player) =>{
    let $player = $trDoc(player);
    playerInfoSub[$player.find("player_key").text()] = {
      currentPosition: $player.find("selected_position position").text(),
      startingStatus: $player.find("starting_status > is_starting").text() || undefined
    };
  });
  return playerInfoSub;
};

module.exports.parsePlayerStats = ($psDocs, playerInfoSub, statIDMap, dailyGameMap) => {
  let allPlayerInfo = [];

  // parse player info and stats
  $psDocs.forEach($psDoc => {
    $psDoc("player").each((i, player) => {
      let $player = $psDoc(player);
      let $playerStats = $player.find("player_stats");
      let playerKey = $player.find("player_key").text();
      allPlayerInfo.push({
        ...playerInfoSub[playerKey],
        key: playerKey,
        name: $player.find("name > full").text(),
        team: $player.find("editorial_team_full_name").text(),
        status: $player.find("status").text() || undefined,
        imageUrl: $player.find("url").text() || undefined,
        eligiblePosList: $player.find("eligible_positions > position").map((i,position)=>$psDoc(position).text()).get(),
        stats: $playerStats.find("stats > stat").map((i, stat) => {
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
    let gamesPlayed = playerInfo.stats.filter(stat=>stat.displayName==="GP")[0].count;
    let totalFps = 0, averageFps = 0;
    if(gamesPlayed > 0) {
      totalFps = calculateTotalFps(playerInfo);
      averageFps = totalFps / gamesPlayed;
    }
    let todaysGame = dailyGameMap && dailyGameMap[Object.keys(dailyGameMap).find(team=>team.toLowerCase()===playerInfo.team.toLowerCase())];
    return {
      ...playerInfo,
      todaysGame: todaysGame,
      aggregateStats: {
        totalFanPoints: totalFps,
        averageFanPoints: averageFps,
      }
    };
  });

  return allPlayerInfo;
};

let calculateTotalFps = (playerInfo) => {
  return playerInfo.stats.reduce((acc, stat) => {
    if(stat.enabled === "1") {
      if(isNaN(parseFloat(stat.count)) || isNaN(parseFloat(stat.fanPointsPerUnit))) {
        return acc;
      }
      return acc + stat.count * stat.fanPointsPerUnit;
    }
    return acc;
  }, 0);
};

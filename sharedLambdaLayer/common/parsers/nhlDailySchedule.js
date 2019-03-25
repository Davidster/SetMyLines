module.exports.parseNhlDailySchedule = (gmDoc) => {
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

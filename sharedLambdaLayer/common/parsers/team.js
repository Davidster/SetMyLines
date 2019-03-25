module.exports.parseTeamDoc = ($teamDoc) => {
  let teams = [];
  if($teamDoc) {
    $teamDoc("league").each((i, league) => {
      let $league = $teamDoc(league);
      let leagueKey = $league.find("league_key").text();
      let leagueName = $league.find("name").first().text();
      let leagueUrl = $league.find("url").text();
      let leagueYear = $league.find("season").text();
      let leagueGameCode = $league.find("game_code").text();
      $league.find("team").each((i, team) => {
        let $team = $teamDoc(team);
        let teamKey = $team.find("team_key").first().text();
        let teamName =$team.find("name").first().text();
        let teamUrl = $team.find("url").first().text();
        let teamLogoUrl = $team.find("team_logo url").first().text();
        teams.push({
          leagueKey: leagueKey,
          leagueName: leagueName,
          leagueUrl: leagueUrl,
          leagueYear: leagueYear,
          leagueGameCode: leagueGameCode,
          teamName: teamName,
          teamUrl: teamUrl,
          teamLogoUrl: teamLogoUrl,
          teamKey: teamKey
        });
      })
    });
    return teams;
  }
};

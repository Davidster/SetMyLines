var express = require("express");
var router = express.Router();
const requester = require("../requester");

// users;use_login=1/games;is_available=1;game_keys=nhl/leagues/teams
const TEAMS_QUERY = "users;use_login=1/games/leagues/teams";

router.get("/", async (req, res, next) => {

  try {
    let $ = await requester(TEAMS_QUERY, req.headers.authorization, res);
    if($) {
      let teams = [];
      $("league").each((i, league) => {
        let $league = $(league);
        let leagueKey = $league.find("league_key").first().text();
        let leagueName = $league.find("name").first().text();
        let leagueUrl = $league.find("url").first().text();
        let leagueYear = $league.find("season").first().text();
        $league.find("team").each((i, team) => {
          let $team = $(team);
          let teamKey = $team.find("team_key").first().text();
          let teamName =$team.find("name").first().text();
          let teamUrl = $team.find("url").first().text();
          let teamLogoUrl = $team.find("team_logo url").first().text();
          teams.push({
            leagueKey: leagueKey,
            leagueName: leagueName,
            leagueUrl: leagueUrl,
            leagueYear: leagueYear,
            teamName: teamName,
            teamUrl: teamUrl,
            teamLogoUrl: teamLogoUrl,
            teamKey: teamKey
          });
        })
      });
      res.send(JSON.stringify(teams));
    }
  } catch(err) {
    console.log(err);
    res.status(500).send();
  }
});

module.exports = router;

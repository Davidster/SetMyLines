var express = require("express");
var router = express.Router();
const requester = require("../requester");

router.get("/", async (req, res, next) => {
  let authHeader = req.headers.authorization;
  // let query = "users;use_login=1/games;is_available=1;game_keys=nhl/leagues/teams";
  let query = "users;use_login=1/games/leagues/teams";
  try {
    let $ = await requester(query, authHeader, res);
    if($) {
      let teams = [];
      $("league").each((i, league) => {
        let $league = $(league);
        let leagueName = $league.find("name").first().text();
        let leagueUrl = $league.find("url").first().text();
        let leagueYear = $league.find("season").first().text();
        $league.find("team").each((i, team) => {
          let $team = $(team);
          let teamName =$team.find("name").first().text();
          let teamUrl = $team.find("url").first().text();
          let teamLogoUrl = $team.find("team_logo url").first().text();
          teams.push({
            leagueName: leagueName,
            leagueUrl: leagueUrl,
            leagueYear: leagueYear,
            teamName: teamName,
            teamUrl: teamUrl,
            teamLogoUrl: teamLogoUrl
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

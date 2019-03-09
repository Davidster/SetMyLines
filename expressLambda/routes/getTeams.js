const express = require("express");
const router = express.Router();
const { requester, refreshTokenIfNeeded } = require("../requester");
const { parseTeamDoc } = require("../parsers/team");

// users;use_login=1/games;is_available=1;game_keys=nhl/leagues/teams
const TEAMS_QUERY = "users;use_login=1/games/leagues/teams";

router.get("/", async (req, res, next) => {
  try {
    let $teamDoc = await requester(TEAMS_QUERY, JSON.parse(req.cookies.accessToken), res, true);
    res.send(JSON.stringify(parseTeamDoc($teamDoc)));
  } catch(err) {
    console.log(err);
    res.status(500).send();
  }
});

module.exports = router;

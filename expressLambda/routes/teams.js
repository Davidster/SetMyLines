const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const { parseTeamDoc } = require(path.join(process.env.COMMON_PATH, "yahoo/team"));
const { requester, refreshTokenIfNeeded } = require(path.join(process.env.COMMON_PATH, "yahoo/requester"));

const TEAMS_QUERY = "users;use_login=1/games/leagues/teams";

router.get("/", asyncMiddleware(async (req, res, next) => {
  try {
    let $teamDoc = await requester(TEAMS_QUERY, {}, JSON.parse(req.cookies.accessToken), res, true);
    // TODO: filter leagues that are not in the current year
    let teamsArray = parseTeamDoc($teamDoc).sort((a,b)=>(b.leagueYear-a.leagueYear)).filter(league=>league.leagueGameCode==="nhl");
    res.json({ teams: teamsArray });
  } catch(err) {
    console.log(err);
    res.status(500).send();
  }
}));

module.exports = router;

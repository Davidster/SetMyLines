const path = require("path");
const express = require("express");
const router = express.Router();
const asyncMiddleware = require("./asyncMiddleware");
const { parseTeamDoc } = require(path.join(process.env.LIB_PATH, "yahoo/team"));
const { parseLeagueSettings } = require(path.join(process.env.LIB_PATH, "yahoo/roster"));
const { requester, refreshTokenIfNeeded, verifyIDToken } = require(path.join(process.env.LIB_PATH, "yahoo/requester"));

const TEAMS_QUERY = "users;use_login=1/games/leagues/teams";

router.get("/", asyncMiddleware(async (req, res, next) => {
  let accessToken = JSON.parse(req.cookies.accessToken);
  try {

    // prepare access token
    let tokenCheckResults = await Promise.all([
      verifyIDToken(accessToken.id_token),
      refreshTokenIfNeeded(accessToken, res)
    ]);
    accessToken = tokenCheckResults[1];

    let $teamDoc = await requester(TEAMS_QUERY, {}, accessToken, res, false);
    // TODO: filter leagues that are not in the current year
    let teamsArray = parseTeamDoc($teamDoc).sort((a,b)=>(b.leagueYear-a.leagueYear)).filter(league=>(
      league.leagueGameCode==="mlb" ||
      league.leagueGameCode==="nhl"
    ));

    await Promise.all(teamsArray.map(team => addSettings(team, accessToken, res)));

    teamsArray = teamsArray.filter(({isSupported})=>isSupported).concat(
                 teamsArray.filter(({isSupported})=>!isSupported));

    res.json({ teams: teamsArray });
  } catch(err) {
    console.log(err);
    throw new Error("Error getting user's teams");
  }
}));

const addSettings = async (team, accessToken, res) => {
  const { leagueKey, leagueName, teamName } = team;
  const $lsDoc = await requester(`league/${leagueKey}/settings`, {}, accessToken, res, false);
  let positionCapacityMap = {};
  const { scoringType } = parseLeagueSettings($lsDoc, {}, positionCapacityMap);
  // TODO: verify that this is valid logic for all games
  // so far, I am aware of three possible values for scoringType: head, point, and headpoint
  // so the team is supported if the league's scoring type is not head and includes at least one bench position
  team.isSupported = (!!positionCapacityMap.BN) && (scoringType !== "head");
};

module.exports = router;

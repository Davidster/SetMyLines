const fs = require("fs-extra");
const rp = require("request-promise");

(async () => {
  let yahooTeams = await fs.readFile("yahooTeams.json", "utf-8").then(file=>JSON.parse(file));
  // let nhlTeams = await fs.readFile("nhlTeams.json", "utf-8").then(file=>JSON.parse(file));
  let nhlTeams = await rp("https://statsapi.web.nhl.com/api/v1/teams").then(res=>JSON.parse(res).teams.map(team=>team.name));
  let yahooTeamsSet = new Set();
  let nhlTeamsSet = new Set();
  let fullTeamsSet = new Set();
  yahooTeams.forEach(team => {
    yahooTeamsSet.add(team);
    fullTeamsSet.add(team);
  });
  nhlTeams.forEach(team => {
    nhlTeamsSet.add(team);
    fullTeamsSet.add(team);
  });
  console.log("yahoo count: ", Array.from(yahooTeamsSet).length);
  console.log("nhl count: ", Array.from(nhlTeamsSet).length);
  console.log("full count: ", Array.from(fullTeamsSet).length);
  console.log("full list: ", Array.from(fullTeamsSet));
})();

let apiRequest = (options) => {
  return new Promise((resolve, reject) => {
    $.ajax(options).done((data) => {
      resolve(JSON.parse(data));
    }).catch((err) => {
      console.log("request error", err);
      reject(err);
    });
  });
};

let getTeams = () => apiRequest({
  type: "GET",
  url: "/getTeams"
});

let getTeamRoster = (teamKey) => apiRequest({
  type: "GET",
  url: `/getTeamRoster?teamKey=${teamKey}`
});

let getTeamRosterPost = (csrfToken) => apiRequest({
  type: "POST",
  url: `/getTeamRoster`,
  headers: {
    'CSRF-Token': csrfToken
  },
  data: {
    hello: "wurld"
  }
});

let buildTeamDivs = (teams) => {
  $resultsContainer = $("#resultsContainer");
  $resultsContainer.empty();
  $resultsContainer.append(teams.sort((a,b)=>(b.leagueYear-a.leagueYear)).map(team => (`
    <div class="row" data-teamkey="${team.teamKey}">
      <img src="${team.teamLogoUrl}"></img>
      <a href="${team.teamUrl}">${team.teamName}</a>
      <div>&nbsp;from&nbsp;</div>
      <a href="${team.leagueUrl}">${team.leagueName}</a>
      <div>&nbsp;(${team.leagueYear})</div>
    </div>
  `)).join(""));
  $("#resultsContainer .row > img").on("click", async (e) => {
    let teamKey = $(e.target).parent().data("teamkey");
    let teamRoster = await getTeamRoster(teamKey);
    console.log(`Roster for team ${teamKey}:`, teamRoster);
    let csrfToken = $("meta[name='csrf-token']").attr("content");
    console.log("csrfToken:", csrfToken);
    let teamRosterPost = await getTeamRosterPost(csrfToken);
    console.log(`teamRosterPost:`, teamRosterPost);
  });
};

$(async () => {
  let teams = await getTeams();
  console.log("/getTeams API call:", teams);
  buildTeamDivs(teams);
});

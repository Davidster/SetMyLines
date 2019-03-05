let setAccessToken = (accessTokenObj) => {
  document.cookie = `accessToken=${accessTokenObj}`;
};

let getCookieMap = () => {
  let rawCookies = document.cookie.split(";");
  let cookieMap = {};
  rawCookies.forEach(rawCookie => {
  	let asArray = rawCookie.trim().split("=");
  	cookieMap[asArray[0]] = asArray[1];
  });
  return cookieMap;
};

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

let getTeams = async () => apiRequest({
  type: "GET",
  url: "/getTeams"
});

let getTeamRoster = async (teamKey) => apiRequest({
  type: "GET",
  url: `/getTeamRoster?teamKey=${teamKey}`
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
  });
};

$(async () => {
  // return console.log("Heylo wurld!");
  let cookieMap = getCookieMap();
  let accessTokenObj = cookieMap.accessToken;
  if(!accessTokenObj && window.location.hostname !== "localhost") {
    return window.location.replace("/login");
  }
  setAccessToken(accessTokenObj);

  let teams = await getTeams();
  console.log("/getTeams API call:", teams);
  buildTeamDivs(teams);
});

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

let refreshableRequest = (options) => {
  return new Promise((resolve, reject) => {
    let success = (data) => {
      resolve(JSON.parse(data));
    }
    $.ajax(options).done(success).catch((err) => {
      if(err.status === 401 && err.responseText === "token_expired") {
        console.log("Token expired. Refreshing");
        $.ajax({
          type: "POST",
          url: "/refreshToken"
        }).done((accessTokenObj) => {
          setAccessToken(accessTokenObj);
          $.ajax(options).done(success);
        });
      }
      console.log("request error", err);
    });
  });
};

let getTeams = async () => refreshableRequest({
  type: "GET",
  url: "/getTeams"
});

let getTeamRoster = async (teamKey) => refreshableRequest({
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

let accessToken;

let setAccessToken = (accessTokenObj) => {
  localStorage.setItem("accessToken", accessTokenObj);
  accessToken = JSON.parse(accessTokenObj);
  $.ajaxSetup({
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`
    }
  });
};

$(() => {
  let accessTokenObj = localStorage.getItem("accessToken");
  if(!accessTokenObj && window.location.hostname !== "localhost") {
    return window.location.replace("/login");
  }
  setAccessToken(accessTokenObj);

  let requestOptions = {
    type: "GET",
    url: "/getTeams"
  };
  let success = (data) => {
    let results = JSON.parse(data);
    console.log("/getTeams API call results:", results);
    $resultsContainer = $("#resultsContainer");
    $resultsContainer.empty();
    $resultsContainer.append(results.sort((a,b)=>(b.leagueYear-a.leagueYear)).map(team => (`
      <div class="row">
        <img src="${team.teamLogoUrl}"></img>
        <a href="${team.teamUrl}">${team.teamName}</a>
        <div>&nbsp;from&nbsp;</div>
        <a href="${team.leagueUrl}">${team.leagueName}</a>
        <div>&nbsp;(${team.leagueYear})</div>
      </div>
    `)).join(""));
  };
  $.ajax(requestOptions).done(success).catch((err) => {
    if(err.status === 401 && err.responseText === "token_expired") {
      console.log("Token expired. Refreshing");
      $.ajax({
        type: "POST",
        url: "/refreshToken",
        data: { accessTokenObj: JSON.stringify(accessToken) }
      }).done((accessTokenObj) => {
        setAccessToken(accessTokenObj);
        $.ajax(requestOptions).done(success);
      });
    }
    console.log("request error", err);
  });

  // $("#login").on("click", (e) => {
  //   let email = $emailInput.val();
  //   let password = $passwordInput.val();
  //   $.ajax({
  //     type: "POST",
  //     url: "/login",
  //     data: {
  //       email: email,
  //       password: password
  //     }
  //   }).done((data) => {
  //     console.log("POST response:", data);
  //   });
  // });
});

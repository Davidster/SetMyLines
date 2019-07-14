import $ from "jquery";

let csrfToken;

let apiRequest = (options) => {
  return new Promise((resolve, reject) => {
    $.ajax({
      ...options,
      url: `${process.env.REACT_APP_API_URL.slice(0, -1)}${options.url}`,
      xhrFields: { withCredentials: true }
    }).done((data) => {
      resolve(data);
    }).catch((err) => {
      // console.log("request error", err);
      reject(err);
    });
  });
};

let getLoginUrl = () => apiRequest({
  type: "GET",
  url: "/loginUrl"
});

let loginCallback = (code) => apiRequest({
  type: "POST",
  url: `/loginCallback?code=${code}`
});

let logout = () => apiRequest({
  type: "POST",
  url: "/logout"
});

let validateToken = () => apiRequest({
  type: "GET",
  url: "/verifyToken"
}).then(tokenValidResponse => {
  csrfToken = tokenValidResponse.csrfToken;
  return tokenValidResponse;
});

let getTeams = () => apiRequest({
  type: "GET",
  url: "/teams"
});

let getTeamRoster = (teamKey, date) => apiRequest({
  type: "GET",
  url: `/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`
});

let updateTeamRoster = (teamKey, lineup, date) => apiRequest({
  type: "PUT",
  url: `/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`,
  headers: {
    "CSRF-Token": csrfToken
  },
  data: {
    lineup: lineup
  }
});

let getSubscriptions = () => apiRequest({
  type: "GET",
  url: "/subscriptions"
});

let addSubscription = (teamKey, stat) => apiRequest({
  type: "POST",
  url: `/subscriptions`,
  headers: {
    "CSRF-Token": csrfToken
  },
  data: {
    teamKey: teamKey,
    stat: stat
  }
});

let deleteSubscription = (teamKey) => apiRequest({
  type: "DELETE",
  url: `/subscriptions`,
  headers: {
    "CSRF-Token": csrfToken
  },
  data: {
    teamKey: teamKey
  }
});

let getEmail = () => apiRequest({
  type: "GET",
  url: "/email"
});

let registerEmail = emailAddress => apiRequest({
  type: "POST",
  url: `/email/register`,
  headers: {
    "CSRF-Token": csrfToken
  },
  data: {
    email: emailAddress
  }
});

export {
  getTeams,
  getTeamRoster,
  updateTeamRoster,
  validateToken,
  getSubscriptions,
  addSubscription,
  deleteSubscription,
  getEmail,
  registerEmail,
  getLoginUrl,
  loginCallback,
  logout
};

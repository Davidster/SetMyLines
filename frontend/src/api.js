import $ from "jquery";

let csrfToken;

let apiRequest = (options) => {
  return new Promise((resolve, reject) => {
    $.ajax(options).done((data) => {
      resolve(data);
    }).catch((err) => {
      console.log("request error", err);
      reject(err);
    });
  });
};

let validateToken = () => apiRequest({
  type: "GET",
  url: "/api/verifyToken"
}).then(tokenValidResponse => {
  csrfToken = tokenValidResponse.csrfToken;
  return tokenValidResponse;
});

let getTeams = () => apiRequest({
  type: "GET",
  url: "/api/teams"
});

let getTeamRoster = (teamKey, date) => apiRequest({
  type: "GET",
  url: `/api/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`
});

let updateTeamRoster = (teamKey, lineup, date) => apiRequest({
  type: "PUT",
  url: `/api/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`,
  headers: {
    "CSRF-Token": csrfToken
  },
  data: {
    lineup: lineup
  }
});

let getSubscriptions = () => apiRequest({
  type: "GET",
  url: "/api/subscriptions"
});

let addSubscription = (teamKey, stat) => apiRequest({
  type: "POST",
  url: `/api/subscriptions`,
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
  url: `/api/subscriptions`,
  headers: {
    "CSRF-Token": csrfToken
  },
  data: {
    teamKey: teamKey
  }
});

let getEmail = () => apiRequest({
  type: "GET",
  url: "/api/email"
});

let registerEmail = emailAddress => apiRequest({
  type: "POST",
  url: `/api/email/register`,
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
  registerEmail
};

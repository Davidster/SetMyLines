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

export default {
  verifyEmail: (userID, verificationCode) => apiRequest({
    type: "POST",
    url: "/email/verify",
    data: {
      userID: userID,
      verificationCode: verificationCode
    }
  }),
  
  getLoginUrl: () => apiRequest({
    type: "GET",
    url: "/loginUrl"
  }),
  
  loginCallback: (code) => apiRequest({
    type: "POST",
    url: `/loginCallback?code=${code}`
  }),
  
  logout: () => apiRequest({
    type: "POST",
    url: "/logout"
  }),
  
  validateToken: () => apiRequest({
    type: "GET",
    url: "/verifyToken"
  }).then(tokenValidResponse => {
    csrfToken = tokenValidResponse.csrfToken;
    return tokenValidResponse;
  }),
  
  getTeams: () => apiRequest({
    type: "GET",
    url: "/teams"
  }),
  
  getTeamRoster: (teamKey, date) => apiRequest({
    type: "GET",
    url: `/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`
  }),
  
  updateTeamRoster: (teamKey, lineup, date) => apiRequest({
    type: "PUT",
    url: `/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`,
    headers: {
      "CSRF-Token": csrfToken
    },
    data: {
      lineup: lineup
    }
  }),
  
  getSubscriptions: () => apiRequest({
    type: "GET",
    url: "/subscriptions"
  }),
  
  addSubscription: (teamKey, stat) => apiRequest({
    type: "POST",
    url: `/subscriptions`,
    headers: {
      "CSRF-Token": csrfToken
    },
    data: {
      teamKey: teamKey,
      stat: stat
    }
  }),
  
  deleteSubscription: (teamKey) => apiRequest({
    type: "DELETE",
    url: `/subscriptions`,
    headers: {
      "CSRF-Token": csrfToken
    },
    data: {
      teamKey: teamKey
    }
  }),
  
  getSettings: () => apiRequest({
    type: "GET",
    url: "/settings"
  }),
  
  updateSettings: (emailAddress) => apiRequest({
    type: "PUT",
    url: `/settings`,
    headers: {
      "CSRF-Token": csrfToken
    },
    data: { emailAddress }
  })
};
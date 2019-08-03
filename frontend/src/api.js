let csrfToken;

let apiRequest = (method, path, data) => (
  fetch(`${process.env.REACT_APP_API_URL.slice(0, -1)}${path}`, {
    method: method,
    body: JSON.stringify(data),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": !!data ? csrfToken : undefined
    }
  }).then(res=>res.json())
);

export default {
  verifyToken: () => apiRequest(
    "GET",
    "/verifyToken"
  ).then(tokenValidResponse => {
    csrfToken = tokenValidResponse.csrfToken;
    return tokenValidResponse;
  }),

  getLoginUrl: () => apiRequest("GET", "/loginUrl"),
  loginCallback: code => apiRequest("POST", `/loginCallback?code=${code}`),
  logout: () => apiRequest("POST", "logout"),

  getTeams: () => apiRequest("GET", "/teams"),
  getTeamRoster: (teamKey, date) => apiRequest(
    "GET",
    `/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`
  ),
  updateTeamRoster: (teamKey, lineup, date) => apiRequest(
    "PUT",
    `/teamRoster?teamKey=${teamKey}&date=${date.format("YYYY-MM-DD")}`,
    { lineup }
  ),
  
  getSubscriptions: () => apiRequest("GET", "/subscriptions"),
  addSubscription: (teamKey, stat) => apiRequest(
    "POST",
    `/subscriptions`,
    { teamKey, stat }
  ),
  deleteSubscription: (teamKey) => apiRequest(
    "DELETE",
    `/subscriptions`,
    { teamKey }
  ),
  
  getSettings: () => apiRequest("GET", "/settings"),
  updateSettings: (emailAddress) => apiRequest(
    "PUT",
    `/settings`,
    { emailAddress }
  )
};
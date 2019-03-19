// sets up the proxy to the express backend running on the same machine.
// It is to be used during development and will not be enabled in production
const proxy = require("http-proxy-middleware");

module.exports = function(app) {
  app.use(proxy('/api', { target: 'http://localhost:3001/' }));
};

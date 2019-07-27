const path = require("path");
const createError = require("http-errors");
const express = require("express");
const csrf = require("csurf");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const logger = require("morgan");
const cache = require("memory-cache");

// set environment variables defined in lambda layer
require(path.join(process.env.LIB_PATH, "setupEnvironment"));

const csrfProtection = csrf({ cookie: true });
const verifyTokenRouter = require("./routes/verifyToken");
const loginUrlRouter = require("./routes/loginUrl");
const loginCallbackRouter = require("./routes/loginCallback");
const logoutRouter = require("./routes/logout");
const teamsRouter = require("./routes/teams");
const teamRosterRouter = require("./routes/teamRoster");
const subscriptionsRouter = require("./routes/subscriptions");
const settingsRouter = require("./routes/settings");
const emailRouter = require("./routes/email");

// use in-memory cache if running locally to improve development speed
let memCache = new cache.Cache();
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    if(!process.env.LOCAL_CACHE) {
      next();
    } else {
      const key = `__express__${(req.originalUrl || req.url)}`;
      const cacheContent = memCache.get(key);
      if(req.method === "GET" && cacheContent){
        console.log("Cache hit for key: ", key);
        res.send(cacheContent);
        return;
      } else {
        res.sendResponse = res.send;
        res.send = (body) => {
          memCache.put(key,body,duration*1000);
          res.sendResponse(body)
        }
        next();
      }
    }
  }
}

const app = express();

app.use(logger("common"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  credentials: true,
  origin: [
    new RegExp(`http://localhost:`),
    "https://setmylines.com"
  ]
}));
app.use(cookieParser());

app.use("/verifyToken", csrfProtection, verifyTokenRouter);
app.use("/loginUrl", csrfProtection, loginUrlRouter);
app.use("/loginCallback", loginCallbackRouter);
app.use("/logout", logoutRouter);
app.use("/teams", csrfProtection, cacheMiddleware(3600), teamsRouter);
app.use("/teamRoster", csrfProtection, cacheMiddleware(3600), teamRosterRouter);
app.use("/subscriptions", csrfProtection, subscriptionsRouter);
app.use("/settings", csrfProtection, settingsRouter);
app.use("/email", emailRouter);
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(res.locals.message);
});

module.exports = app;

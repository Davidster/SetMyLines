const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const logger = require("morgan");
const dotenv = require("dotenv");
dotenv.config();

const indexRouter = require("./routes/index");
const loginRouter = require("./routes/login");
const loginCallbackRouter = require("./routes/loginCallback");
const getTeams = require("./routes/getTeams");
const getTeamRoster = require("./routes/getTeamRoster");

const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
if(!clientID || !clientSecret) {
  console.log("missing client id or client secret");
  process.exit(1);
}
// Set the configuration settings
const credentials = {
  client: {
    id: clientID,
    secret: clientSecret
  },
  auth: {
    tokenHost: "https://api.login.yahoo.com",
    authorizePath: "oauth2/request_auth",
    tokenPath: "oauth2/get_token"
  }
};
// Initialize the OAuth2 Library
oauth2 = require("simple-oauth2").create(credentials);

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("common"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/login", loginRouter);
app.use("/loginCallback", loginCallbackRouter);
app.use("/getTeams", getTeams);
app.use("/getTeamRoster", getTeamRoster);


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
  res.render("error");
});

module.exports = app;

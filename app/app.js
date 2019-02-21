var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var dotenv = require("dotenv");
dotenv.config();
var passport = require("passport");
var YahooStrategy = require("passport-yahoo-oauth2").Strategy;

var indexRouter = require("./routes/index");
var authRouter = require("./routes/auth");
// var loginRouter = require("./routes/login");
// var loginCallbackRouter = require("./routes/loginCallback");
var refreshToken = require("./routes/refreshToken");
var getTeams = require("./routes/getTeams");
var getTeamRoster = require("./routes/getTeamRoster");

passport.use(new YahooStrategy({
    consumerKey: process.env.CLIENT_ID,
    consumerSecret: process.env.CLIENT_SECRET,
    callbackURL: `http://${process.env.OAUTH_DOMAIN}/loginCallback`
  },
  function(token, tokenSecret, profile, done) {
    return done(null, profile);
    // User.findOrCreate({ yahooId: profile.id }, function (err, user) {
    //   return done(err, user);
    // });
  }
));

// You can use this section to keep a smaller payload
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

var session = require("express-session");

// config express-session
var sess = {
  secret: "123456",
  cookie: {},
  resave: false,
  saveUninitialized: true
};

if (app.get("env") === "production") {
  // sess.cookie.secure = true; // serve secure cookies, requires https
}

app.use(session(sess));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/", authRouter);
// app.use("/login", loginRouter);
// app.use("/loginCallback", loginCallbackRouter);
app.use("/refreshToken", refreshToken);
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

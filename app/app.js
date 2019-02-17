var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var loginCallbackRouter = require('./routes/loginCallback');
var getTeams = require('./routes/getTeams');
var refreshToken = require('./routes/refreshToken');

let clientID = process.env.CLIENT_ID;
let clientSecret = process.env.CLIENT_SECRET;
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

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/loginCallback', loginCallbackRouter);
app.use('/getTeams', getTeams);
app.use('/refreshToken', refreshToken);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

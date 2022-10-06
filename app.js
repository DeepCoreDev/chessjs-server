var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongodb = require('./util/mongodb');
var session = require('express-session');
var bodyParser = require('body-parser');
var chess = require('./chess/chess');
var ratelimiter = require('./util/ratelimiter');
const MongoStore = require('connect-mongo');

mongodb.connect();

var indexRouter = require("./routes/index");
var userRouter = require("./routes/user");
var variantRouter = require('./routes/variant');
var editorRouter = require('./routes/editor');
var chessRouter = require('./routes/chess');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const store = MongoStore.create({
  mongoUrl: mongodb.url
});

var sess = {
  secret: '81d482ntg548g-239mfd8302n03nd89-0',
  resave: false,
  saveUninitialized: true,
  cookie: {},
  maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week,
  store,
}

if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
} else {
  app.use(logger("dev"));
}

var sess = session(sess);

app.use(sess);
chess.useSession(store);

app.use('/', ratelimiter.new(50)); // 100 requests per seconds per user
app.use("/api", indexRouter);
app.use('/api/user', userRouter);
app.use('/api/variant', variantRouter);
app.use('/api/chess', chessRouter);
app.use('/api/editor', editorRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.ENV === "dev" ? err : {};

  console.log(err);

  res.status(500);
  res.json({
    message: err.message,
  });
});

module.exports = app;

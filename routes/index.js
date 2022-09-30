var express = require("express");
var router = express.Router();
var mongodb = require("../util/mongodb");
const mailer = require("../mailer.js");
const auth = require('../util/auth')

router.get("/", function (req, res, next) {
  res.send(null);
});

router.get("/fetch", function (req, res, next) {
  res.send({
    user: req.session.user || false,
  });
});

router.post("/signup", async function (req, res, next) {
  await mongodb.client.connect();
  const db = mongodb.client.db("chessjs");
  const collection = db.collection("users");

  if (req.body.username && req.body.email && req.body.password) {

  } else {
    res.status(442);
    res.send({ message: "Username, email or password is invalid." });
    return;
  }

  // First check if details are valid
  if (
    req.body.username.match(
      /^(?=[a-zA-Z0-9._]{4,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/
    ) &&
    req.body.email.match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    ) &&
    req.body.password.length >= 10
  ) {
  } else {
    res.status(442);
    res.send({ message: "Username, email or password is invalid." });
    return;
  }

  // First check if username is available
  var isAvailable = (await collection.findOne({ username: req.body.username })) == null;

  if (!isAvailable) {
    res.status(409);
    res.send({ message: "Username is already taken." });
    return;
  }

  var user = {
    display_name: req.body.display_name,
    username: req.body.username.toLowerCase(),
    password: auth.hashPassword(req.body.password),
    email: req.body.email,
    description: "Hello! I'm new, so I haven't customised my description yet!",
    join_date: new Date().toISOString(),
    permission: 0, // Permission == membership
    games: [],
    library: [],
    private: true,
    liked: [],
    saved: [],
    pfp: '/api/media/default-pfp.png',
    backer: false,
  };

  mailer.sendSignupEmail(user.email);

  collection.insertOne(user).then((e) => {
    req.session.user = user;
    delete req.session.user.password;
    req.session.user.current_user = true;

    res.status(200);
    res.json({
      user: user,
    });
  });
});

router.post("/login", async function (req, res, next) {
  var user = await auth.authenticateUser(req.body.username, req.body.password);
  if (user) {
    req.session.user = user;
    delete req.session.user.password;
    req.session.user.current_user = true;
    if (!req.body.remember) {
      req.sessionOptions.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    res.status(200);
    res.send(user);
  } else {
    res.status(401);
    res.send({ message: "Incorrect username or password." });
  }
});

module.exports = router;

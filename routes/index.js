var express = require("express");
var router = express.Router();
var mongodb = require("../util/mongodb");
const mailer = require("../mailer.js");
const auth = require('../util/auth');
const crypto = require('crypto');
const axios = require('axios');

const application_id = "6337d618838ae6fae5ea2854";
const application_secret = "yHySm5BD75wQ1kbrBvq3Kd0FjwMFpvMq";
const deepcore_server = process.env.ENV === "dev" ? "http://localhost:5174" : "https://deepcore.dev";

let states = {};

router.get("/", function (req, res, next) {
  res.send(null);
});

router.get("/fetch", function (req, res, next) {
  if (req.session.accessToken) {

    if (!req.session.user || req.session.lastUpdated + (1000 * 60 * 30) < Date.now()) {
      axios.get(`${deepcore_server}/api/oauth/user`, {
        headers: {
          'Authorization': JSON.stringify({
            application_id,
            accessToken: req.session.accessToken
          })
        }
      }).then((e) => {
        if (e.data.user) {
          req.session.user = e.data.user;
          req.session.lastUpdated = Date.now();
          res.status(200);
          res.send({
            user: req.session.user,
          });
        }
      }).catch((e) => {
        console.log(e);
        delete req.session.accessToken;
        delete req.session.lastUpdated;
        res.status(400);
        res.send({ user: false });
      })
    } else {
      res.send({
        user: req.session.user,
      });
    }


  } else {
    res.send({ user: false });
  }

});

router.post("/oauth/authorize", async function (req, res, next) {
  let state = crypto.randomUUID();
  let code = crypto.randomUUID();
  req.session.stateCode = code;
  states[state] = code;
  res.status(200);
  res.send({
    redirect: `${deepcore_server}/oauth/authorize?application_id=6337d618838ae6fae5ea2854&state=${encodeURIComponent(state)}${process.env.ENV === "dev" ? '&redirect=' + encodeURIComponent("http://localhost:5173/callback") : ''}`
  });
});


router.post("/oauth/callback", async function (req, res, next) {
  let code = req.body.code; // This is the one from the callback
  let state = req.body.state;
  if (states[state] == req.session.stateCode // This one is the state
    && (states[state] != null && req.session.stateCode != null)) {
    axios.post(`${deepcore_server}/api/oauth/access_token`, {
      code,
      application_id,
      application_secret
    })
      .then((e) => {
        req.session.accessToken = e.data.accessToken;
        req.session.lastUpdated = Date.now();
        res.status(200);
        res.send({});
      })
      .catch((e) => {
        console.log(e);
        res.status(e.status);
        res.send(e.response.data);
      })
  } else {
    res.status(400);
    res.send({
      message: `Invalid state`
    })
  }
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

router.post('/forgot', async function (req, res, next) {
  if (req.body.email) {
    await mongodb.client.connect();
    const db = mongodb.client.db("chessjs");
    const collection = db.collection("users");

  } else {
    res.status(400);
    res.send({ message: "Invalid email" });
  }
});

module.exports = router;

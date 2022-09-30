var express = require("express");
var router = express.Router();
var userutil = require("../util/userutil");
const multer = require("multer");
const fs = require("fs");
const sharp = require('sharp');
const urlutil = require('../util/urlutil');
var mongodb = require("../util/mongodb");

const salt = "$2b$10$0ynp.zKILeTkGzS9vVMd1O";

function hashPassword(password) {
  return bcrypt.hashSync(password, salt);
}

router.get("/fetch", function (req, res, next) {
  var data = urlutil.collectparams(req.originalUrl.split("?")[1]);
  let username = data.id;
  userutil.getUser(username).then((user) => {
    if (!user) {
      throw new Error("User not valid");
    }

    var admin = req.session.user?.permission == 999;
    var current_user = req.session.user?.username == user.username;

    if(!current_user && !admin && user.private){
      throw new Error("User private");
    }

    if(req.session.user && req.session.user.username == user.username){
      user.current_user = true;
    }

    delete user.password;
    res.status(200);
    res.send(user);
  }).catch((e) => {
    console.log(e);
    res.status(404);
    res.send({ message: "Can't find user with that username" });
  });

});

router.post("/*", async function (req, res, next) {
  if (!req.session.user) {
    res.json({
      status: 403,
      message: "Not logged in",
    });
  } else {
    await mongodb.client.connect();
    next();
  }
});

router.post("/pfp", multer().any(), function (req, res, next) {
  var file = req.files[0];
  if (file.size > 10000000) {
    res.status(413);
    res.send({ message: "Profile picture is over 10 MB" });
    return;
  }
  var filename =
    "/api/media/users/" +
    req.session.user.username +
    ".png";
  fs.writeFileSync("./public" + filename, "");
  sharp(file.buffer).resize(350).toFile("./public" + filename)
  req.session.user.pfp = filename;
  userutil.updateOne(req.session.user.username, "pfp", filename);
  res.status(200);
  res.send({})
});

function checkAndUpdate(name, req) {
  if (req.body[name] != null) {
    var i = req.body[name];
    userutil.updateOne(req.session.user.username, name, i);
    req.session.user[name] = i;
  }
}

router.post("/update", function (req, res, next) {
  checkAndUpdate("display_name", req);
  checkAndUpdate("description", req);
  checkAndUpdate("private", req);

  if (req.body.password) {
    if (req.body.new_password.length < 10) {
      res.status(442);
      res.send({ message: "Invalid password" });
      return;
    }
    if (req.session.user.password == hashPassword(req.body.password)) {
      var password = hashPassword(req.body.new_password);
      userutil.updateOne(req.session.user.username, "password", password);
      req.session.user = null;
    } else {
      res.status(401);
      res.send({ message: "Incorrect password" });
      return;
    }
  }

  res.status(200);
  res.send({});
});

router.post("/logout", function (req, res, next) {
  req.session.user = null;
  res.status(200);
  res.send({})
})

module.exports = router;

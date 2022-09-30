var express = require("express");
var router = express.Router();
var mongodb = require("../util/mongodb");
const userutil = require('../util/userutil');
const urlutil = require('../util/urlutil')
const variantutil = require('../util/variantutil');
const multer = require("multer");
const fs = require('fs');
const sharp = require('sharp');
const editorutil = require('../util/editorutil');
const { ObjectId } = require("mongodb");

router.get("/fetch", async function (req, res, next) {
  await mongodb.client.connect();
  const db = mongodb.client.db("chessjs");
  const collection = db.collection("variants");
  var data = urlutil.collectparams(req.originalUrl.split("?")[1] || "");
  let id = data.id;
  let author = data.author;
  if (id) {
    try {
      collection.findOne({ _id: new ObjectId(id) }).then((e) => {
        if (e) {
          res.status(200);
          res.send(e);
        } else {
          res.status(404);
          res.send({});
        }
      });
    } catch (e) {
      res.status(404);
      res.send({});
    }
  } else {
    var params = {
      author: author
    };
    if (!author) {
      delete params.author;
    }
    collection.find(params).toArray(function (err, result) {
      if (err) throw err;
      var start = parseInt(data.start) || 0;
      var end = start + (parseInt(data.count) || 20);
      result = result.slice(start, end);

      result = result.sort((a, b) => {
        if (req.session.user) {
          var saves = (req.session.user.saved || []);
          var a_saved = saves.includes(a._id + "");
          var b_saved = saves.includes(b._id + "");
          if(a_saved && !b_saved){
            return -1;
          }
          if(!a_saved && b_saved){
            return 1;
          }
        }
        if ((a.likes || 0) < (b.likes || 0)) {
          return 1;
        }
        if ((a.likes || 0) > (b.likes || 0)) {
          return -1;
        }
        return 0;
      });


      res.status(200);
      res.send(result);
    });
  }

});

router.post("/*", function (req, res, next) {
  if (!req.session.user) {
    res.status(403);
    res.json({
      message: "Not logged in",
    });
  } else {
    next();
  }
});

router.post("/create", async function (req, res, next) {
  await mongodb.client.connect();
  const db = mongodb.client.db("chessjs");
  const collection = db.collection("variants");

  var filename = "/api/media/variant_icons/index.jpg";

  var variant = {
    title: req.body.title || "My New Variant",
    author: req.session.user.username,
    icon: filename,
    likes: 0,

    // Data
    players: 2,
    engine: false,
    plays: 0,
    features: [{
      name: "An Example Feature",
      description: "A very amazing and fun element of this variant that the author definitely programmed! This is totally not the default."
    }]
  };


  collection.insertOne(variant).then((e) => {
    editorutil.createEditorObject(e.insertedId);
    req.session.user.library.push(e.insertedId);
    userutil.updateOne(req.session.user.username, "library", req.session.user.library);
    res.status(200);
    res.send(e.insertedId);
  });
});

function checkAndUpdate(id, name, req) {
  if (req.body[name] != null) {
    var i = req.body[name];
    variantutil.updateOne(id, name, i);
  }
}

router.post("/update", multer().any(), function (req, res, next) {
  var data = urlutil.collectparams(req.originalUrl.split("?")[1] || "");
  var id = data.id || req.body.id;
  if (id) {
    if (req.session.user && req.session.user.library.includes(id)) {
      checkAndUpdate(id, "title", req);
      checkAndUpdate(id, "description", req);
      checkAndUpdate(id, "features", req);
      checkAndUpdate(id, "players", req);
      var file = req.files ? req.files[0] : null;
      if (file) {
        if (file.size > 1000000) {
          res.status(413);
          res.send({ message: "Variant icon is over 1 MB" });
          return;
        }
        var filename =
          "/api/media/variant_icons/" +
          id +
          ".png";
        fs.writeFileSync("./public" + filename, "");
        sharp(file.buffer).resize(350).toFile("./public" + filename)
        variantutil.updateOne(id, "icon", filename);
      }
      res.status(200);
      res.send({});
    } else {
      res.status(403);
      res.send({});
    }

  } else {
    res.status(442);
    res.send({ message: "Invalid id" });
  }
});

router.post('/action', async function (req, res, next) {
  await mongodb.client.connect();
  var data = urlutil.collectparams(req.originalUrl.split("?")[1] || "");
  var id = data.id || req.body.id;
  var action = data.action || req.body.action;
  if (id && action && req.session.user) {
    if (action == "like") {
      var liked = req.session.user.liked;
      var variantLikes = variantutil.getVariant(id).likes || 0;
      if (liked.includes(id)) {
        //Unliked
        req.session.user.liked.splice(liked.indexOf(id), 1);
        userutil.updateOne(req.session.user.username, "liked", req.session.user.liked);
        variantutil.updateOne(id, "likes", Math.max(variantLikes - 1, 0));
      } else {
        //Liked
        req.session.user.liked.push(id);
        userutil.updateOne(req.session.user.username, "liked", req.session.user.liked);
        variantutil.updateOne(id, "likes", variantLikes + 1);
      }
    } else if (action == "save") {
      if (req.session.user.saved.includes(id)) {
        //Unsaved
        req.session.user.saved.splice(req.session.user.saved.indexOf(id), 1);
        userutil.updateOne(req.session.user.username, "saved", req.session.user.saved);
      } else {
        //Saved
        req.session.user.saved.push(id);
        userutil.updateOne(req.session.user.username, "saved", req.session.user.saved);
      }
    } else {
      res.status(422);
      res.send({ message: "Unable to gleen action to take" });
      return;
    }
    res.status(200);
    res.send({});
  } else {
    res.status(442);
    res.send({ message: "Invalid id or action" });
  }
})

router.post('/delete', async function (req, res, next) {
  var data = urlutil.collectparams(req.originalUrl.split("?")[1] || "");
  var id = data.id || req.body.id;
  if (id) {
    var library = req.session.user.library;
    if (req.session.user && library.includes(id)) {
      await mongodb.client.connect();
      const db = mongodb.client.db("chessjs");
      const collection = db.collection("variants");
      collection.deleteOne({ id: id });
      req.session.user.library.splice(library.indexOf(id), 1);
      userutil.updateOne(req.session.user.username, "library", req.session.user.library);
      res.status(200);
      res.send({});
    } else {
      res.status(403);
      res.send({});
    }
  } else {
    res.status(442);
    res.send({ message: "Invalid id" });
  }
});

module.exports = router;

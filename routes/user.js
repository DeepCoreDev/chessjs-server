var express = require("express");
var router = express.Router();
const urlutil = require('../util/urlutil');
const { default: axios } = require("axios");

const salt = "$2b$10$0ynp.zKILeTkGzS9vVMd1O";
const deepcore_server = process.env.ENV === "dev" ? "http://localhost:5174" : "https://deepcore.dev";


function hashPassword(password) {
  return bcrypt.hashSync(password, salt);
}

router.get("/fetch", function (req, res, next) {
  var data = urlutil.collectparams(req.originalUrl.split("?")[1]);
  let username = data.id;
  axios.get(`${deepcore_server}/api/user/fetch?username=${username}`)
    .then((e) => {
      let user = e.data.user;

      user.admin = false;
      user.current_user = req.session.user?.username == user.username;

      for(let i = 0; i < (user.roles.chessjs || []); i++){
        if(user.roles.chessjs[i].permission >= 999){
          user.admin = true;
        }
      }

      res.status(200);
      res.send(user);
    })
    .catch((e) => {
      res.status(404);
      res.send({ message: "Can't find user with that username" });
    })

});

router.post("/logout", function (req, res, next) {
  delete req.session.user;
  delete req.session.accessToken;
  delete req.session.lastUpdated;
  res.status(200);
  res.send({})
})

module.exports = router;

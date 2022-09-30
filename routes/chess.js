var express = require("express");
var router = express.Router();
var chess = require('../chess/chess');
var urlutil = require('../util/urlutil');
const fs = require('fs');
const { NodeVM, VMScript } = require('vm2');

router.post('/new', function (req, res, next) {
    if (!req.session.user) {
        res.status(403);
        res.send({
            message: "Not logged in"
        });
    }
    var data = urlutil.collectparams(req.originalUrl.split("?")[1] || "");
    var variantID = data["variant_id"] || "632026e2be87f97ef47794db";
    var path = './chess/variants/' + variantID + ".js";
    if(fs.existsSync(path)){
        res.status(200);
        res.send({
            play_id: chess.startGame(variantID)
        });
    }else{
        res.status(404);
        res.send({
            message: "Missing or invalid variant ID"
        });
    }
});


module.exports = router;

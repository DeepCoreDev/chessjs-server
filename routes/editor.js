var express = require("express");
var router = express.Router();
var urlutil = require('../util/urlutil');
var editorutil = require('../util/editorutil');
var variantutil = require('../util/variantutil');
var ratelimiter = require('../util/ratelimiter');
const fs = require('fs');

function notfound(res) {
    res.status(404);
    res.send({});
}

router.all('*', function (req, res, next) {
    if (!req.session.user) {
        res.status(403);
        res.send({});
        return;
    }
    next();
})

router.get('/fetch', function (req, res, next) {
    var data = urlutil.collectparams(req.originalUrl.split("?")[1]);
    if (data.id) {
        variantutil.getVariant(data.id).then((variantObj) => {
            editorutil.getEditorObject(variantObj.linkedID).then((editorObj) => {
                if (variantObj.author == req.session.user?.username) {
                    res.status(200);
                    res.send(editorObj);
                } else {
                    res.status(404);
                    res.send({});
                }
            }).catch((e) => {
                console.log(e);
                notfound(res);
            })
        }).catch((e) => {
            console.log(e);
            notfound(res);
        })

    } else {
        res.status(400);
        res.send({
            message: "No variant ID"
        })
    }
});

router.all('*', ratelimiter.new(1/60));

router.post('/report', function (req, res, next) {
    if (req.body.id) {
        var title = req.body.title;
        var description = req.body.description;
        var author = req.session.user.username;
        variantutil.getVariant(req.body.id).then((variantObj) => {
            editorutil.getEditorObject(variantObj.linkedID).then((editorObj) => {
                editorObj.reports.push({
                    title,
                    description,
                    author
                });
                editorutil.updateEditorObject(editorObj._id, "reports", editorObj.reports).then((e) => {
                    res.status(200);
                    res.send({});
                }).catch((e) => {
                    console.log(e);
                    res.status(500);
                    res.send({});
                });
            }).catch((e) => {
                console.log(e);
                res.status(500);
                res.send({});
            });
        }).catch((e) => {
            console.log(e);
            res.status(500);
            res.send({});
        });
    } else {
        res.status(400);
        res.send({
            message: "No variant ID"
        });
    }
});


module.exports = router;

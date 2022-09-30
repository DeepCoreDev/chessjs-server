const { ObjectId } = require("mongodb");
var mongodb = require("./mongodb");
const db = mongodb.client.db("chessjs");
const collection = db.collection("variants");

async function updateOne(id, key, data) {
    await mongodb.client.connect();
    var toSet = {};
    toSet[key] = data;
    collection.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: toSet,
        }
    );
}

async function getVariant(id) {
    await mongodb.client.connect();
    var variant = await collection.findOne({ _id: new ObjectId(id) });
    return variant;
}

module.exports = {
    updateOne: updateOne,
    getVariant: getVariant,
};

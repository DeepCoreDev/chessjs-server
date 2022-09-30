const { ObjectId } = require("mongodb");
var mongodb = require("./mongodb");
const db = mongodb.client.db("chessjs");
const collection = db.collection("editor");

var variantutil = require('./variantutil');

async function updateEditorObject(id, key, data) {
  var toSet = {};
  toSet[key] = data;
  await collection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: toSet,
    }
  );
}

async function getEditorObject(id) {
  await mongodb.client.connect();
  var user = await collection.findOne(
    {
      _id: new ObjectId(id),
    },
    {}
  );
  return user;
}

function createEditorObject(variantID) {
  // Callback hell
  variantutil.getVariant(variantID).then((variant) => {
    collection.insertOne({
      linkedID: variant._id,
      readInbox: [], // Inbox is system messages, fetched from a central location
      reports: [], // Reports are variant/editor specific
      code: {}
    }).then((editorObj) => {
      variantutil.updateOne(variantID, "linkedID", editorObj.insertedId);
    });
  })
}

module.exports = {
  updateEditorObject,
  getEditorObject,
  createEditorObject,
};

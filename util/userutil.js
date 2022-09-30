var mongodb = require("./mongodb");
const db = mongodb.client.db("chessjs");
const collection = db.collection("users");

function updateOne(username, key, data) {
  var toSet = {};
  toSet[key] = data;
  collection.updateOne(
    {
      username: username,
    },
    {
      $set: toSet,
    }
  ).then((e) => {

  });
}

async function getUser(username) {
  await mongodb.client.connect();
  var user = await collection.findOne(
    {
      username: username,
    },
    {}
  );
  return user;
}

module.exports = {
  updateOne: updateOne,
  getUser: getUser,
};

const salt = "$2b$10$0ynp.zKILeTkGzS9vVMd1O";
var mongodb = require("./mongodb");
var bcrypt = require("bcrypt");

async function authenticateUser(username, password){
    await mongodb.client.connect();
    const db = mongodb.client.db("chessjs");
    const collection = db.collection("users");
  
    var user = await collection.findOne({
      username: username
    }, {});
  
    if(user && user.password == hashPassword(password)){
      delete user._id;
        return user;
    }else{
        return null;
    }
}

function hashPassword(password) {
  return bcrypt.hashSync(password, salt);
}

module.exports = {
    hashPassword,
    authenticateUser
}
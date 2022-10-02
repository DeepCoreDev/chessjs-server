const { MongoClient } = require('mongodb');

const host = 'deepcore.dev';
const username = encodeURIComponent("chessjsadmin");
const password = encodeURIComponent("chessjs#2");
const database = "chessjs";
const authMechanism = "DEFAULT";

const url = `mongodb://${username}:${password}@${host}:27017/${database}?authMechanism=${authMechanism}`;

var client = new MongoClient(url);

function isConnected() {
    return !!client && !!client.topology && client.topology.isConnected()
}

async function connect() {
    try {
        await client.connect();
        if(isConnected()){
            console.log("Connected to database");
        }
    } finally {
        await client.close();
    }
}

module.exports = {
    client: client,
    connect: connect,
    url
}
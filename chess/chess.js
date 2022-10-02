var socket = require('./socket');
var io = socket.start();
const crypto = require('crypto');
const { NodeVM } = require('vm2');
const fs = require('fs');
const mongodb = require('../util/mongodb');
var session;

var play_ids = {

};

var socketsByUserID = {

}

io.use(async (socket, next) => {
    try {
        // Check valid play_id
        const play_id = socket.handshake.auth.play_id;
        if (!play_ids[play_id]) {
            console.log("invalid ID");
            next();
            socket.send({
                code: 404,
                message: "Invalid play ID"
            });
            socket.disconnect();
            return;
        }
        let cookieString = socket.handshake.headers.cookie;

        const parseCookie = str =>
            str
                .split(';')
                .map(v => v.split('='))
                .reduce((acc, v) => {
                    acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
                    return acc;
                }, {});

        let cookies = parseCookie(cookieString);

        let cookieId = cookies["connect.sid"].substring("s:".length).split(".")[0];

        await mongodb.client.connect();
        const db = mongodb.client.db("chessjs");
        const collection = db.collection("sessions");
        collection.findOne({ _id: cookieId })
            .then((e) => {
                if (!e) {
                    return;
                }
                let session = JSON.parse(e.session);
                if (session.user) {
                    socket.session = session;
                    socket.play_id = play_id;
                    socketsByUserID[session.user.username] = socket;
                    next();
                } else {
                    next();
                    socket.send({
                        code: 403,
                        message: "Not logged in"
                    });
                    socket.disconnect();
                    return;
                }
            })

    } catch (e) {
        console.log(e);
    }

})

io.on('connection', (socket) => {
    if (socket.play_id) {
        // We've successfully authorised & we have a play_id
        joinGame(socket, socket.play_id);
    }
});

// Returns play_id to connect to the game
function startGame(variantID) {
    var play_id = crypto.randomUUID();
    var path = './chess/variants/' + variantID + ".js";
    var variantCode = fs.readFileSync(path, 'utf-8');

    // Create VM
    var variantVM = new NodeVM({
        console: 'inherit',
        sandbox: {},
    });
    // Load module
    var variantModule = variantVM.run(variantCode);

    play_ids[play_id] = {
        vm: variantVM,
        module: variantModule,
        play_id: play_id,
        players: [],
        getPiecePositions: variantModule.getPiecePositions, // Just remap for clarity
        getValidMoves: variantModule.getValidMoves, // Just remap for clarity
        variantID: variantID,
    }

    return play_id;
}

function joinGame(socket, play_id) {
    if (!play_ids[play_id].players.includes(socket.session.user.username)) {
        if (play_ids[socket.play_id].players.length < play_ids[socket.play_id].module.players) {
            // There's space in the game
            play_ids[play_id].players.push(socket.session.user.username);
        } else {
            return;
        }
    }

    sendUpdate(socket, play_id);
    socket.on("requestUpdate", (m) => {
        sendUpdate(socket, play_id);
    });

    socket.on("move", (m) => {
        var player_id = play_ids[play_id].players.indexOf(socket.session.user.username) + 1;
        console.log(m.move);
        if (play_ids[play_id].module.getTurn() == player_id) {
            play_ids[play_id].module.makeMove(m.move, player_id);
            for (let i = 0; i < play_ids[play_id].players.length; i++) {
                sendUpdate(socketsByUserID[play_ids[play_id].players[i]], play_id);
            }
        }
    });

    setInterval(() => {
        sendUpdate(socket, play_id);
    }, 2500);
}

function useSession(sess) {
    session = sess;
}

function sendUpdate(socket, play_id) {
    var player_id = play_ids[play_id].players.indexOf(socket.session.user.username) + 1;
    socket.emit("update", {
        validMoves: play_ids[play_id].getValidMoves(player_id),
        turn: play_ids[play_id].module.getTurn(),
        piecePositions: play_ids[play_id].getPiecePositions(player_id),
        board: play_ids[play_id].module.board(player_id),
        player_id,
        gameover: play_ids[play_id].module.isGameover(),
        meta: {
            players: play_ids[play_id].players,
            variantID: play_ids[play_id].variantID
        }
    });
}

io.listen(4113);

module.exports = {
    startGame,
    useSession,
    play_ids
}
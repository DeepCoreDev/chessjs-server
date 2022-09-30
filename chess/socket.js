var server;

function start(){
    const io = require('socket.io')( {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        path: '/socket'
    });

    return io;
}

module.exports = {
    server: server,
    start: start
}
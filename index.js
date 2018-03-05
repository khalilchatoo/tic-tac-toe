const express = require('express');
let app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

let rooms = 0;

app.use(express.static('.'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/game.html');
})

io.on('connection', (socket) => {
    socket.on('createGame', (data) => {
        socket.join(`room-${++rooms}`);
        socket.emit('newGame', {
            name: data.name,
            room: `room-${rooms}`
        });

    });

    socket.on('joinGame', (data) => {
        let room = io.nsps['/'].adapter.rooms[data.room];
        if( room && room.length == 1 ){
            socket.join(data.room);
            socket.broadcast.to(data.room).emit('player1', {});
            socket.emit('player2', {
                name: data.name,
                room: data.room
            })
        } else {
            socket.emit('err', {
                message: 'Sorry, the room is full.'
            });
        }
    });

    socket.on('playerTurn', (data) => {
        socket.broadcast.to(data.room).emit('turnPlayed', {
            tile: data.tile,
            room: data.room
        });
    });

    socket.on('gameEnded', (data) => {
        socket.broadcast.to(data.room).emit('gameEnd', data);
    })
});

server.listen(5000);
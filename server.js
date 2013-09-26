'use strict';


var io = require('socket.io');
var check = require('validator').check,
    sanitize = require('validator').sanitize;

// show the native socket.ui events, just for info
var events = io.parser.packets;
console.log(events)



var app = require('express')()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server, { log: true });

io.set('log level', 1); // reduce logging

var port = 3000;

server.listen(3000, function(){
    console.log('Server listening on port ' + port);
});


app.get('/client.html', function (req, res) { res.sendfile(__dirname + '/client.html'); });
app.get('/status.html', function (req, res) { res.sendfile(__dirname + '/status.html'); });
app.get('/frames.html', function (req, res) { res.sendfile(__dirname + '/frames.html'); });

var myUsers = {};

var roomHistory = {};

// roomHistory['room1'] = ['a','bb','ccc'] 
// roomHistory['room2'] = ['aaa','bb','c'] 

io.sockets.on('connection', function (socket) {


    socket.on('joinRoom', function(room) {
        reportStatus(socket);
    });

    socket.on('register', function (data) {
        var name = data.name;
        var room = data.room;

        var roomList = Object.keys(socket.manager.rooms).map(function(key) { return key; })
        // console.log(roomList)
        // socket.in(room).broadcast.emit('statusUpdate', name, ' has connected ' + room);


        // updateClients(socket, room);



        var userList = Object.keys(myUsers).map(function(key) { return myUsers[key].username; })
        if ( userList.indexOf(name) > -1){
            console.log(name + ' already registered!');
        }
        else {

            console.log('Registering ' + name + ' in ' + room);
            myUsers[socket.id] = {'username': name, 'room': room };
            socket.join(room);
            socket.in(room).broadcast.emit('statusUpdate', name, ' has connected ' + room);

            for (var i in roomHistory[room]){
                var line = roomHistory[room][i]
                socket.in(myUsers[socket.id].room).emit('toClient', line);
            }

        }

        updateClients(socket, room);
    });

    socket.on('sendMessage', function (data) {
        var room = myUsers[socket.id].room;
        var msg = data.name+': ' + sanitize(data.msg).escape();

        socket.in(room).emit('toClient', msg);
        socket.in(room).broadcast.emit('toClient', msg);
        if (!roomHistory[room]) {roomHistory[room] = [];}
        roomHistory[room].push(msg);
    });

    socket.on('disconnect', function() {
        reportStatus(socket);
        if (myUsers[socket.id]){
            var name = myUsers[socket.id].username;
            var room = myUsers[socket.id].room
            socket.in(room).broadcast.emit('statusUpdate', name, ' has disconnected ' +room);
        }
        delete myUsers[socket.id];
        updateClients(socket, room);
    });
});

var updateClients = function(socket, room){
    // console.log(io.sockets.manager.connected)
    // console.log(myUsers)

    var userList = Object.keys(myUsers).map(function(key) {if (myUsers[key].room == room) return myUsers[key].username;});
    io.sockets.in(room).emit('sendUserList', userList); 

    var allUserList = Object.keys(myUsers).map(function(key) { return myUsers[key].username; });
    io.sockets.emit('sendAllUserList', allUserList); 

    var roomList = Object.keys(socket.manager.rooms).map(function(key) { return key; })
    io.sockets.emit('sendRoomList', roomList); 
}

var reportStatus = function(socket){
    var o = Object.keys(socket.manager.open).length
    , c = Object.keys(socket.manager.closed).length
    , h = Object.keys(socket.manager.handshaken).length

    console.log("---");
    console.log("open: " + o +", closed: " + c + ", handshaken: " + h)
    console.log("---");

    // console.log(socket.manager.rooms)
}
var express = require("express");
var app = express();
var server = require("http").Server(app);
var io = require("socket.io")(server);
app.use(express.static(__dirname + "/public"));

app.get("/", function (req, res) {
    res.render("/index.html");
});

var playerCount = 0;
var id = guid();
var tagged = false;
var players = [];
var team = 0;

function guid() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return "_" + Math.random().toString(36).substr(2, 9);
};
function rtema() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    var a = Math.random() + 1;
    if (a <= 1.5) return 1;
    else return 2;
};
io.on("connection", function (socket) {
    playerCount++;
    id = guid();
    team = rtema();
    players.push({ pid: id, k: 0, d: 0 });
    console.log("Player:" + id + " is connected");
    setTimeout(function () {
        //if (!tagged) {
        //  socket.emit('connected', { playerId: id, tagged: true });
        //} else {
        //  socket.emit('connected', { playerId: id });
        //}
        socket.emit("connected", { playerId: id, teamID: team });
        io.emit("count", { playerCount: playerCount });
    }, 1000);

    socket.on("disconnect", function () {
        playerCount--;
        io.emit("count", { playerCount: playerCount });
        console.log("disconnected");
    });


    // viết một hàm cập nhật điểm ở server
    socket.on("kdcounter", function (data) {
        //var i = players.map(ind => ind.pid).indexOf(data['playerId']);
        var i = players.map(function (playerid) { return playerid.pid}).indexOf(data["playerId"]);
        if (i>=0) {
        players[i].k += 1;
        //console.log('>>'+players[i].k);
            try {
                socket.broadcast.emit("C_kdcouter", { kill:players[i].k });
            }
            catch (e) {
                console.log("" + e);
            }
        }
    });
    //***********************************  
    socket.on("update", function (data) {
        try {
            socket.broadcast.emit("updated", data);
        }
        catch (e) {
            console.log("" + e);
        }
    });

    socket.on("wol", function (data) {
        try {
            if (data[" towerteam"] != data["colteam"])
                winorlose = data["colteam"];
            else winorlose = 3;
            socket.broadcast.emit("woled",{result: winorlose });
        }
        catch (e) {
            console.log("" + e);
        }
    });

    socket.on("tag", function (data) {
        io.emit("tagged", data);
    });

    socket.on("firex", function (data) {
        socket.broadcast.emit("fired", data);

    });
});

setInterval(function () {
    //tagged = false;
}, 3000);

var port = 8080;

server.listen(port);
console.log("Multiplayer app listening on port " + port);

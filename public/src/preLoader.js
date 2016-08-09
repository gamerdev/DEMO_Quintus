/*
 * 24072016: add server by node.js
 * 24072016: add firex, fired to control bullet throw server
 * 28072016: add bullet.playerID to know who shot
 * 30072016: Add lstX,lstY,lstID,lststop to control disconnect case (sent length packageds=-1)
 * 30072016: Add update to actor 
 * 09082016: Add source to Github, remove actor update
*/
function guid() {
    return '_' + Math.random().toString(36).substr(2, 9);
};
function randomSide(team) {
    orX = 100 + Math.random() * 300 * (team-1);
    orY = 100 + Math.random() * 300 + 800 * (team-1);
};
var selfId, player, orX, orY;
//disconnect handler value
var lstX, lstY, lstpID, lstop;
var isdis = false;
//---------------------------
window.addEventListener("load", function () {
    var players = [];
    var socket = io.connect('http://localhost:8080');
    //var socket = io.connect('192.168.1.42:8080');
    var UiPlayers = document.getElementById("players");
    var UiKill = document.getElementById("Scores");
    var UiTeam = document.getElementById("Team");
    
    socket.on('count', function (data) {
        UiPlayers.innerHTML = 'ONLINE: ' + data['playerCount'];
    });
    
    socket.on('C_kdcouter', function (data) {
        UiKill.innerHTML = 'DEAD: ' + data['kill'];
    });
    
    var objectFiles = [
        './src/Player'
    ];
    
    // Set up an instance of the Quintus engine  and include
    // the Sprites, Scenes, Input and 2D module. The 2D module
    // includes the `TileLayer` class as well as the `2d` componet.
    var Q = window.Q = Quintus({ audioSupported: ['wav', 'mp3', 'ogg'] })
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio,SVG,Physics")
        // Maximize this game to whatever the size of the browser is
        .setup({ maximize: true })
        // And turn on default input controls and touch input (for UI)
        .controls(true).touch()
        // Enable sounds.
        .enableSound();
    // chuyen gravity tung phia
    Q.gravityX = 0;
    Q.gravityY = 0;
    Q.debug = false;
    
    var SPRITE_PLAYER = 2;
    var SPRITE_ENVIROMENT = 1;
    var SPRITE_ENEMY = 3;
    var SPRITE_BULLET = 4;
    var Gteam = 0;
    var delay = 15;
    var isprevent = false;
    
    Q.Sprite.extend('Actor', {
        init: function (p) {
            this._super(p, {
                update: true
            });
            
            var temp = this;
            this.on("hit.sprite", function (collision) {
                if (collision.obj.isA("Bullet") && this.p.opacity != 0) {
                    this.p.opacity = 0;
                    this.p.y = -500;
                    /**********************************/
                    this.p.socket.emit('update', {
                        playerId: this.p.playerId,
                        opacity: this.p.opacity,
                        x: -300,
                        y: -300,
                    });
                    /********************************/
                    this.p.socket.emit('kdcounter', {
                        playerId: this.p.playerId,
                    });
                }
            });
            setInterval(function () {
                if (!temp.p.update) {
                    temp.destroy();
                }
                temp.p.update = false;
            }, 60000);
        }
    });
    
    Q.Sprite.extend("Player", {
        init: function (p) {
            
            this._super(p, {
                sheet: "player",  // Setting a sprite sheet sets sprite width and height
                sprite: "player",
                direction: "right",
                x: 410, y: 90,
                standingPoints: [[-16, 44], [-23, 35], [-23, -48], [23, -48], [23, 35], [16, 44]],
                duckingPoints: [[-16, 44], [-23, 35], [-23, -10], [23, -10], [23, 35], [16, 44]],
                jumpSpeed: -400,
                speed: 32,
                type: SPRITE_PLAYER,
                collisionMask: SPRITE_BULLET | SPRITE_ENVIROMENT,
                team: 0,
                
                fire: function (x, y, vxx, vyy) {
                    var ball = window.ball = new Q.Bullet({
                        w: 5, h: 5,
                        x: x, y: y,
                        team: Gteam,
                        vx: vxx, vy: vyy,
                        ax: 3, ay: 3,
                        plid: selfId,
                    });
                    isprevent = true;
                    Q.stage(0).insert(ball);
                }
            });
            
            this.p.points = this.p.standingPoints;
            
            this.add('2d, stepControls, animation, tween');
            
            this.on("hit.sprite", function (collision) {
                if (collision.obj.isA("Bullet") && collision.obj.p.plid != selfId) {
                    this.p.opacity = 0;
                    this.p.x = -300;
                    this.p.y = -300;
                    this.stage.unfollow();
                    //update ở đây nếu cần
                    this.p.socket.emit('update', {
                        playerId: this.p.playerId,
                        x: this.p.x,
                        y: this.p.y,
                        sheet: this.p.sheet,
                        angle: this.p.angle,
                        frame: this.p.frame,
                        opacity: this.p.opacity,
                    });
                    Q.stageScene("endGame", 1, { label: "You Lose!" });
                }
            });
        },
        
        resetLevel: function () {
            Q.stageScene("level1");
            this.p.strength = 100;
            this.animate({ opacity: 1 });
            Q.stageScene('hud', 3, this.p);
        },
        
        continueOverSensor: function () {
            this.p.vy = 0;
            if (this.p.vx != 0) {
                this.play("walk_" + this.p.direction);
            } else {
                this.play("stand_" + this.p.direction);
            }
        },
        
        step: function (dt) {
            var processed = false;
            if (this.p.immune) {
                // Swing the sprite opacity between 50 and 100% percent when immune.
                if ((this.p.immuneTimer % 12) == 0) {
                    var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
                    this.animate({ "opacity": opacity }, 0);
                    this.p.immuneOpacity = opacity;
                }
                this.p.immuneTimer++;
                if (this.p.immuneTimer > 144) {
                    // 3 seconds expired, remove immunity.
                    this.p.immune = false;
                    this.animate({ "opacity": 1 }, 1);
                }
            }
            
            if (!processed&&this.p.opacity>0) {
                if (delay <= 0) {
                    delay = 15;
                    isprevent = false;
                }
                else delay--;
                var vx = 0;
                var vy = 0;
                var x = this.p.x;
                var y = this.p.y;
                var bspeed = 1200;
                var gunh = 15;
                if (Q.inputs['fire']) {
                    this.p.ignoreControls = true;
                    if (this.p.direction == "up") {
                        vx = 0;
                        vy = -bspeed;
                        y -= this.p.h / 2 + gunh
                    }
                    else if (this.p.direction == "down") {
                        vx = 0;
                        vy = bspeed;
                        y += this.p.h / 2 + gunh
                    }
                    else if (this.p.direction == "left") {
                        vx = -bspeed;
                        vy = 0;
                        x -= this.p.w / 2 + gunh
                    }
                    else if (this.p.direction == "right") {
                        vx = bspeed;
                        vy = 0;
                        x += this.p.w / 2 + gunh
                    }
                    if (!isprevent) {
                        this.p.fire(x, y, vx, vy);
                        this.p.socket.emit('firex', { x: x, y: y, vx: vx, vy: vy, plid: selfId, team: Gteam });
                    }
                }
                //else if (Q.inputs['down'] || Q.inputs['up'] || Q.inputs['right'] || Q.inputs['left']) {
                if (Q.inputs['down']) {
                    //this.p.ignoreControls = true;
                    this.p.direction = "down";
                    this.play("duck_right");
                    this.vy = 400;
                    this.p.angle = 180;
                }
                else if (Q.inputs['up']) {
                    //this.p.ignoreControls = true;
                    this.p.direction = "up";
                    this.play("climb");
                    this.p.angle = 0;
                }
                else if (Q.inputs['right']) {
                    //this.p.ignoreControls = true;
                    this.p.direction = "right";
                    this.p.angle = 90;
                    this.play("walk_right");
                }
                else if (Q.inputs['left']) {
                    
                    this.p.direction = "left";
                    this.play("walk_left");
                    this.p.angle = -90;
                }
                else {
                    this.play("stand_right");
                }
                //-----------------------------------------------
                //console.log("" + this.p.playerId);
                //-----------------------------------------------
                if (this.p.playerId == selfId) {
                    if (isdis) {
                            this.p.x = lstX;
                            this.p.y = lstY;
                            this.p.opacity = lstop;
                            selfId = lstpID;
                            this.p.playerId = selfId;
                            isdis = false;
                            Q.stage(0).add('viewport').follow(player);
                            console.log("Players array have " + players.length + " members");
                    }
                    //update to server by using update function
                    this.p.socket.emit('update', {
                        playerId: this.p.playerId,
                        x: this.p.x,
                        y: this.p.y,
                        sheet: this.p.sheet,
                        angle: this.p.angle,
                        frame: this.p.frame,
                        opacity: this.p.opacity,
                    });
                }
                else {// the old man
                    
                    lstX = this.p.x;
                    lstY = this.p.y;
                    lstpID = this.p.lstpID;
                    lstop = this.p.opacity;
                    isdis = true;
                    this.stage.unfollow();
                    this.destroy();

                }
            }

            //if (this.p.y > 1000) {
            //    this.stage.unfollow();
            //}

            //if (this.p.y > 2000) {
            //    this.resetLevel();
            //}

        }
    });
    
    Q.Sprite.extend("Bullet", {
        type: SPRITE_BULLET,
        team: 0,
        collisionMask: SPRITE_PLAYER | SPRITE_ENEMY | SPRITE_ENVIROMENT,
        draw: function (p) {
            p.fillStyle = "gray";
            p.beginPath();
            p.arc(-this.p.cx,
                -this.p.cy,
                this.p.w / 2, 0, Math.PI * 2);
            p.fill();
            this.add("2d,aibouce");
            this.on("hit", function (collision) {
                this.destroy();
            });
        }
    });
    
    Q.Sprite.extend("Tower", {
        team: 0,
        init: function (p) {
            this._super(p, { sheet: 'tower' });
            
            
            
            
            this.on("hit", function (collision) {
                if (collision.obj.isA("Bullet")) {
                    if (this.p.team == Gteam)
                        Q.stageScene("endGame", 1, { label: "Team " + Gteam + " has lose!" });
                    else Q.stageScene("endGame", 1, { label: "Team " + Gteam + " has won!" });
                    
                    this.p.socket.emit('wol', {
                        towerteam: this.team,
                        colteam: collision.obj.p.team,
                    });
                }
            });
        },
    });
    
    Q.Sprite.extend("Enemy", {
        type: SPRITE_ENEMY,
        collisionMask: SPRITE_ENVIROMENT,
        init: function (p) {
            this._super(p, { sheet: 'enemy', vx: 100 });
            this.add('2d, aiBounce');
            
            this.on("hit.sprite", function (collision) {
                if (collision.obj.isA("Bullet")) {
                    this.destroy();
                }
            });
        }
    });
    //--------------------------------------------------------------------------
    
    
    socket.on('updated', function (data) {
        
        var actor = players.filter(function (obj) {
            return obj.playerId == data['playerId'];
        })[0];
        if (actor) {
            actor.player.p.x = data['x'];
            actor.player.p.y = data['y'];
            actor.player.p.sheet = data['sheet'];
            actor.player.p.angle = data['angle'];
            actor.player.p.frame = data['frame'];
            actor.player.p.opacity = data['opacity'];
            actor.player.p.update = true;
        } else {
            if (iscon){
                var temp = new Q.Actor({
                    playerId: data['playerId'],
                    x: data['x'],
                    y: data['y'],
                    sheet: data['sheet'],
                    angle: data['angle'],
                    frame: data['frame'],
                    opacity: data['opacity'],
                    socket: socket,
                });
                players.push({ player: temp, playerId: data['playerId'] });
                Q.stage(0).insert(temp);
            }
        }
    });
    var iscon = false;
    socket.on('connected', function (data) {
        selfId = data['playerId'];
        Gteam = data['teamID'];
        UiTeam.innerHTML = "TEAM: " + Gteam;
        randomSide(Gteam);// cấp vị trí xuất hiện random
        player = new Q.Player({ playerId: selfId, x: orX, y: orY, team: data['teamID'], socket: socket });
        Q.stage(0).insert(player);
        Q.stage(0).add('viewport').follow(player);
        iscon = true;
        
    });
    
    socket.on('fired', function (data) {
        if (data) {
            var ball = window.ball = new Q.Bullet({
                w: 5, h: 5,
                x: data['x'], y: data['y'],
                vx: data['vx'], vy: data['vy'],
                ax: 3,
                ay: 3,
                plid: data['plid'],
                team: data['team'],
            });
            Q.stage(0).insert(ball);
        }
    });
    
    socket.on('woled', function (data) {
        if (data['result'] == Gteam)
            Q.stageScene("endGame", 1, { label: "Team " + Gteam + " has lose!" });
        else Q.stageScene("endGame", 1, { label: "Team " + Gteam + " has won!" });
    });
    //--------------------------------------------------------------------------
    Q.scene("level1", function (stage) {
        stage.collisionLayer(new Q.TileLayer({
            dataAsset: 'level.json',
            sheet: 'tiles'
        }));
        
        //var bar= new Q.TileLayer({
        //    type: SPRITE_ENVIROMENT,
        //    collisionMask: SPRITE_PLAYER,
        //    dataAsset: 'level.json',
        //    sheet: 'tiles'
        //});
        //stage.insert(bar);
        //var player = stage.insert(new Q.Player());        
        
        //stage.insert(new Q.Enemy({ x: 500, y: 200 }));
        //stage.insert(new Q.Enemy({ x: 600, y: 200 }));
        //stage.insert(new Q.Enemy({ x: 700, y: 200 }));
        //stage.insert(new Q.Enemy({ x: 800, y: 200 }));
        //stage.insert(new Q.Enemy({ x: 900, y: 200 }));
        
        //stage.insert(new Q.Tower({ x: 180, y: 50 }));
        tower = new Q.Tower({ x: 80, y: 200, team: 1, socket: socket });
        etower = new Q.Tower({ x: 900, y: 1200, team: 2, socket: socket });
        Q.stage(0).insert(tower);
        Q.stage(0).insert(etower);

    });
    
    Q.scene('endGame', function (stage) {
        var box = stage.insert(new Q.UI.Container({
            x: Q.width / 2, y: Q.height / 2, fill: "rgba(0,0,0,0.5)"
        }));
        
        var button = box.insert(new Q.UI.Button({
            x: 0, y: 0, fill: "#CCCCCC",
            label: "Play Again"
        }))
        var label = box.insert(new Q.UI.Text({
            x: 10, y: -10 - button.p.h,
            label: stage.options.label
        }));
        button.on("click", function () {
            
            this.p.x = 300;
            this.p.y = 300;
            Q.stage(0).add('viewport').follow(player);
            this.destroy();
            box.destroy();
            label.destroy();
            
            player.p.x = orX;
            player.p.y = orY;
            player.p.opacity = 1;

        });
        box.fit(20);
    });
    
    Q.load("sprites.png, sprites.json, level.json, tiles.png,player.json, player.png", function () {
        Q.sheet("tiles", "tiles.png", { tilew: 32, tileh: 32 });
        //Q.load("sprites.png, sprites.json, level2.json, Rock.png,player.json, player.png", function () {
        //    Q.sheet("tiles", "Rock.png", { tilew: 32, tileh: 32 });
        Q.compileSheets("sprites.png", "sprites.json");
        Q.compileSheets("player.png", "player.json");
        
        Q.animations("player", {
            walk_right: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rate: 1 / 15, flip: false, loop: true },
            walk_left: { frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rate: 1 / 15, flip: "x", loop: true },
            jump_right: { frames: [13], rate: 1 / 10, flip: false },
            jump_left: { frames: [13], rate: 1 / 10, flip: "x" },
            stand_right: { frames: [14], rate: 1 / 10, flip: false },
            stand_left: { frames: [14], rate: 1 / 10, flip: "x" },
            duck_right: { frames: [15], rate: 1 / 10, flip: false },
            duck_left: { frames: [15], rate: 1 / 10, flip: "x" },
            climb: { frames: [16, 17], rate: 1 / 3, flip: false }
        });
        Q.stageScene("level1");
    });
});
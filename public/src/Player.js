require([], function () {
    Q.Sprite.extend('Actor', {
        init: function (p) {
            this._super(p, {
                update: true
            });

            var temp = this;
            setInterval(function () {
                if (!temp.p.update) {
                    temp.destroy();
                }
                temp.p.update = false;
            }, 3000);
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
                speed: 100,
                type: SPRITE_PLAYER,
                collisionMask: SPRITE_BULLET | SPRITE_ENVIROMENT,

                fire: function (x, y, vxx, vyy) {
                    var ball = window.ball = new Q.Bullet({
                        w: 5, h: 5,
                        x: x, y: y,
                        vx: vxx, vy: vyy,
                        ax: 3, ay: 3
                    });
                    Q.stage(0).insert(ball);
                }
            });

            this.p.points = this.p.standingPoints;

            this.add('2d, stepControls, animation, tween');



            //this.on("hit.sprite", function (collision) {
            //    if (collision.obj.isA("Bullet")) {
            //        Q.stageScene("endGame", 1, { label: "You Lose!" });
            //        this.destroy();
            //    }
            //});
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
            if (!processed) {
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
                    this.p.fire(x, y, vx, vy);
                }

                if (Q.inputs['down']) {
                    //this.p.ignoreControls = true;
                    this.p.direction = "down";
                    this.play("duck_right");
                    this.p.angle = 180;
                }
                else if (Q.inputs['up']) {
                    this.p.ignoreControls = true;
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

            }

            if (this.p.y > 1000) {
                this.stage.unfollow();
            }

            if (this.p.y > 2000) {
                this.resetLevel();
            }
            this.p.socket.emit('update', {
                playerId: this.p.playerId,
                x: this.p.x,
                y: this.p.y,
                sheet: this.p.sheet,

            });

        }
    });

})
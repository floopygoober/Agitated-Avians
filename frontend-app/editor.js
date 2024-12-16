var canvas = document.getElementById("game-canvas");
var ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth - 50;
    canvas.height = window.innerHeight - document.querySelector("header").offsetHeight - document.querySelector("footer").offsetHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

var pl = planck;

var world = new pl.World({
    gravity: pl.Vec2(0, -10)
});

var timeStep = 1 / 60;
var velocityIterations = 8;
var positionIterations = 3;

var scale = 30;

var pigs = [];
var boxes = [];
var birdRemaining = 3;
var bird;
var birdLaunched = false;
var score = 0;
var isMouseDown = false;
var isDragging = false;
var draggedObject = null;
var mousePos = pl.Vec2(0, 0);

$(document).ready(function () {
    loadLevelList(); // Load levels on page load
});


// Game object definitions
function createBox(x, y, width, height, dynamic) {
    var bodyDef = {
        position: pl.Vec2(x, y)
    };

    if (dynamic) {
        bodyDef.type = "dynamic";
    }

    var body = world.createBody(bodyDef);
    body.createFixture(pl.Box(width / 2, height / 2), {
        density: 1.0,
        friction: 0.5,
        restitution: 0.1
    });
    body.userData = { type: 'box' };
    return body;
}

function createPig(x, y) {
    var pigRadius = 0.3;
    var pig = world.createDynamicBody(pl.Vec2(x, y));
    pig.createFixture(pl.Circle(pigRadius), {
        density: 0.5,
        friction: 0.5,
        restitution: 0.5,
        userData: "pig"
    });
    pig.isPig = true;
    pig.isDestroyed = false;
    pig.userData = { type: 'pig' };
    return pig;
}

var ground = world.createBody();
ground.createFixture(pl.Edge(pl.Vec2(-50, 0), pl.Vec2(50, 0)), {
    friction: 0.6
});

function createBird() {
    bird = world.createDynamicBody(pl.Vec2(5, 5));
    bird.createFixture(pl.Circle(0.5), {
        density: 1.5,
        friction: 0.5,
        restitution: 0.5,
    });
}

canvas.addEventListener("mousedown", function (event) {
    if (birdRemaining > 0 && !birdLaunched) {
        var rect = canvas.getBoundingClientRect();
        var mouseX = (event.clientX - rect.left) / scale;
        var mouseY = (canvas.height - (event.clientY - rect.top)) / scale;

        var birdPos = bird.getPosition();
        var dist = pl.Vec2.distance(birdPos, pl.Vec2(mouseX, mouseY));

        if (dist < 0.5) {
            isMouseDown = true;
        }
    }

    if (!isMouseDown) {
        var rect = canvas.getBoundingClientRect();
        var mouseX = (event.clientX - rect.left) / scale;
        var mouseY = (canvas.height - (event.clientY - rect.top)) / scale;

        boxes.forEach(function (box) {
            var position = box.getPosition();
            var distance = Math.sqrt(Math.pow(mouseX - position.x, 2) + Math.pow(mouseY - position.y, 2));
            if (distance < 1) {
                isMouseDown = true;
                isDragging = true;
                draggedObject = box;
                mousePos = pl.Vec2(mouseX, mouseY);
            }
        });

        pigs.forEach(function (pig) {
            var position = pig.getPosition();
            var distance = Math.sqrt(Math.pow(mouseX - position.x, 2) + Math.pow(mouseY - position.y, 2));
            if (distance < 0.3) {
                isMouseDown = true;
                isDragging = true;
                draggedObject = pig;
                mousePos = pl.Vec2(mouseX, mouseY);
            }
        });
    }
});

canvas.addEventListener("mousemove", function (event) {
    if (isMouseDown && isDragging && draggedObject) {
        var rect = canvas.getBoundingClientRect();
        var mouseX = (event.clientX - rect.left) / scale;
        var mouseY = (canvas.height - (event.clientY - rect.top)) / scale;
        var dragOffset = pl.Vec2.sub(mousePos, pl.Vec2(draggedObject.getPosition().x, draggedObject.getPosition().y));
        draggedObject.setPosition(pl.Vec2(mouseX, mouseY).add(dragOffset));
    }
    else if (isMouseDown) {
        var rect = canvas.getBoundingClientRect();
        var mouseX = (event.clientX - rect.left) / scale;
        var mouseY = (canvas.height - (event.clientY - rect.top)) / scale;
        mousePos = pl.Vec2(mouseX, mouseY);
    }
});

canvas.addEventListener("mouseup", function (event) {
    if (isMouseDown) {
        isMouseDown = false;
        if (isDragging) {
            isDragging = false;
            draggedObject = null;
        } else {
            bird.setLinearVelocity(pl.Vec2(0, 0));
            bird.setAngularVelocity(0);
            bird.applyLinearImpulse(mousePos.mul(5), bird.getWorldCenter(), true);
            birdLaunched = true;
            birdRemaining--;
        }
    }
});

function initLevel() {
    pigs = [];
    boxes = [];
    birdRemaining = 3;
    birdLaunched = false;
    createBird();
}

document.getElementById("add-block").addEventListener("click", function () {
    var x = Math.random() * 20 + 10;
    var y = Math.random() * 10 + 2;
    var width = 1;
    var height = 2;
    boxes.push(createBox(x, y, width, height, true));
});

document.getElementById("add-pig").addEventListener("click", function () {
    var x = Math.random() * 20 + 10;
    var y = Math.random() * 10 + 2;
    pigs.push(createPig(x, y));
});

world.on("post-solve", function (contact, impulse) {
    if (!impulse) return;

    var fixtureA = contact.getFixtureA();
    var fixtureB = contact.getFixtureB();
    var bodyA = fixtureA.getBody();
    var bodyB = fixtureB.getBody();

    function isGround(body) {
        return body === ground;
    }

    if (bodyA.isPig || bodyB.isPig) {
        var pigBody = bodyA.isPig ? bodyA : bodyB;
        var otherBody = bodyA.isPig ? bodyB : bodyA;

        if (isGround(otherBody)) return;

        var normalImpulse = impulse.normalImpulses[0];

        if (normalImpulse > 1.0) {
            pigBody.isDestroyed = true;
        }
    }
});


function update() {
    world.step(timeStep, velocityIterations, positionIterations);

    pigs = pigs.filter(function (pig) {
        if (pig.isDestroyed) {
            world.destroyBody(pig);
            score += 100;
            return false;
        }
        return true;
    });

    // if (pigs.length === 0 && !isLevelComplete) {  ---- TODO FIX THE LOAD SYSTEM SO THIS CODE DOESNT AUTO TRIGGER
    //     isLevelComplete = true;
    //     setTimeout(function () {
    //         alert("Level Complete!");
    //         nextLevel();
    //     }, 500);
    // }

    if (birdLaunched) {
        var birdPos = bird.getPosition();
        if (birdPos.x > 50 || birdPos.y < -10 || (bird.getLinearVelocity().length() < 0.1 && !isMouseDown)) {
            if (birdRemaining > 0) {
                createBird();
                birdLaunched = false;
            } else {
                setTimeout(function () {
                    alert("Game Over! Try Again");
                    initLevel();
                }, 500);
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.strokeStyle = "#004d40";
    ctx.lineWidth = 2;
    ctx.stroke();

    boxes.forEach(function (box) {
        var position = box.getPosition();
        var angle = box.getAngle();
        var shape = box.getFixtureList().getShape();
        var vertices = shape.m_vertices;
        ctx.save();
        ctx.translate(position.x * scale, canvas.height - position.y * scale);
        ctx.rotate(-angle);
        ctx.beginPath();
        ctx.moveTo(vertices[0].x * scale, -vertices[0].y * scale);
        for (var i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x * scale, -vertices[i].y * scale);
        }
        ctx.closePath();
        ctx.fillStyle = "#795548";
        ctx.fill();
        ctx.restore();
    });

    pigs.forEach(function (pig) {
        var pigPos = pig.getPosition();
        var pigRadius = 0.3;
        ctx.beginPath();
        ctx.arc(pigPos.x * scale, canvas.height - pigPos.y * scale, pigRadius * scale, 0, 2 * Math.PI);
        ctx.fillStyle = "#8bc34a";
        ctx.fill();
    });

    if (bird) {
        var birdPos = bird.getPosition();
        ctx.beginPath();
        ctx.arc(birdPos.x * scale, canvas.height - birdPos.y * scale, 0.5 * scale, 0, 2 * Math.PI);
        ctx.fillStyle = "#f44336";
        ctx.fill();
    }

    if (isMouseDown) {
        var birdPos = bird.getPosition();
        ctx.beginPath();
        ctx.moveTo(birdPos.x * scale, canvas.height - birdPos.y * scale);
        ctx.lineTo(mousePos.x * scale, canvas.height - mousePos.y * scale);
        ctx.strokeStyle = "#9e9e9e";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.fillStyle = "#000";
    ctx.font = "16px Arial";
    ctx.fillText("Score: " + score, 10, 20);
    ctx.fillText("Birds Remaining: " + birdRemaining, 10, 40);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

$("#save-level").click(function () {
    const levelId = $("#level-id").val().trim();

    if (!levelId) {
        alert("Please enter a level ID!");
        return;
    }

    const levelData = [];

    // Saving boxes (blocks)
    boxes.forEach(function (box) {
        const position = box.getPosition();
        const width = 2; // Assuming the width of the box is 2
        const height = 4; // Assuming the height of the box is 4 (since you create boxes with width 1 and height 2, adjust if needed)
        levelData.push({
            x: position.x,
            y: position.y,
            width: width,
            height: height,
            type: "box"
        });
    });

    // Saving pigs
    pigs.forEach(function (pig) {
        const position = pig.getPosition();
        levelData.push({
            x: position.x,
            y: position.y,
            type: "pig"
        });
    });

    // Saving bird
    if (bird) {
        const birdPos = bird.getPosition();
        levelData.push({
            x: birdPos.x,
            y: birdPos.y,
            type: "bird"
        });
    }

    if (levelData.length === 0) {
        alert("The level is empty. Add something before saving.");
        return;
    }

    $.ajax({
        url: `http://localhost:3000/level/` + encodeURIComponent(levelId),
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify(levelData),
        success: function (response) {
            alert("Level saved successfully!");
            loadLevelList(); // Refresh level list dropdown
        },
        error: function (xhr, status, error) {
            alert("Error saving level: " + xhr.responseText);
        }
    });
});


// Load Level function
$("#load-level").click(function () {
    const levelId = $("#level-list").val().trim();

    if (!levelId) {
        alert("Please select a level!");
        return;
    }

    $.ajax({
        url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
        method: "GET",
        success: function (levelData) {
            try {
                const entities = typeof levelData === "string" ? JSON.parse(levelData) : levelData;

                if (!Array.isArray(entities) || entities.length === 0) {
                    alert("This level is empty or invalid.");
                    return;
                }

                // Clear the editor
                pigs = [];
                boxes = [];
                birdRemaining = 3;
                birdLaunched = false;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Render each entity (box, pig, or bird) in the editor
                entities.forEach(function (entity) {
                    if (entity.type === "box") {
                        boxes.push(createBox(entity.x, entity.y, entity.width, entity.height, true)); // Recreate boxes
                    } else if (entity.type === "pig") {
                        pigs.push(createPig(entity.x, entity.y)); // Recreate pigs at their saved position
                    } else if (entity.type === "bird") {
                        birdRemaining = 3; // Reset birds remaining
                        birdLaunched = false;
                        createBird(); // Recreate bird at its saved position (if needed, adjust for specific position)
                        bird.setPosition(pl.Vec2(entity.x, entity.y)); // Set bird position
                    }
                });

                alert("Level loaded successfully!");
            } catch (error) {
                alert("Error processing level data: " + error.message);
            }
        },
        error: function (xhr, status, error) {
            alert("Error loading level: " + xhr.responseText);
        }
    });
});


function loadLevelList() {
    $.ajax({
        url: "http://localhost:3000/levels",  // Endpoint to get all levels
        method: "GET",
        success: function (response) {
            console.log("Loaded levels:", response);  // Check if the response is correct
            const levelList = $("#level-list");
            levelList.empty();  // Clear the existing list

            if (Array.isArray(response) && response.length > 0) {
                response.forEach(function (level) {
                    levelList.append(new Option(level, level)); // Add each level ID as an option
                });
            } else {
                alert("No levels available.");
            }
        },
        error: function (xhr, status, error) {
            alert("Error loading level list: " + xhr.responseText);
        }
    });
}



// Delete Level function
function deleteLevel() {
    const levelId = $("#level-list").val();
    if (!levelId) {
        alert("Please select a level to delete!");
        return;
    }

    if (!confirm(`Are you sure you want to delete level "${levelId}"?`)) {
        return;
    }

    $.ajax({
        url: `http://localhost:3000/level/${encodeURIComponent(levelId)}`,
        method: "DELETE",
        success: function (response) {
            alert(response);
            loadLevelList(); // Refresh the dropdown list
        },
        error: function (xhr, status, error) {
            alert("Error deleting level: " + xhr.responseText);
        }
    });
}

initLevel();
loop();
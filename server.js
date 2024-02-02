const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server);

const port = process.env.PORT || 6969;

const users = [];
const mathThingies = [];
const MAX_GAMES = 5;
let leaderboard = [];

let ID = 0;

setInterval(gameLoop, 3000);

function gameLoop() {
    // no more than MAX_GAMES games, remove the first and emit to the users
    if (mathThingies.length > MAX_GAMES) {
        io.emit("solved", mathThingies[0].id);
        mathThingies.shift();
    }

    const newMath = generateMathExpression();
    mathThingies.push(newMath);
    console.log("New math", newMath);
    io.emit("new-math", { id: newMath.id, expression: newMath.expression });
}

console.log(generateMathExpression());

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "client", "index.html"));
});

io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("login", (username) => {
        console.log(`User ${username} started the game`);
        socket.username = username;
        socket.score = 0;
        users.push(socket);

        socket.emit("leaderboard", leaderboard);
    });

    socket.on("answer", (answer) => {
        answer = parseInt(answer);

        if (isNaN(answer)) {
            return;
        }

        const user = users.find((user) => user === socket);

        let solved = false;

        for (let i = 0; i < mathThingies.length; i++) {
            const math = mathThingies[i];

            if (math.result === answer) {
                solved = true;
                mathThingies.splice(i, 1);

                io.emit("solved", math.id);
                break;
            }
        }

        if (solved) {
            user.score += answer;
        } else {
            user.score -= Math.floor(answer / 2);
        }

        console.log(socket.username, socket.score);

        updateLeaderboard();
    });
});

function updateLeaderboard() {
    leaderboard = users
        .sort((a, b) => b.score - a.score)
        .map((user) => ({ username: user.username, score: user.score }));

    io.emit("leaderboard", leaderboard);
}

function generateMathExpression() {
    const a = getRandomNumber();
    const b = getRandomNumber();
    const sign = Math.random() > 0.5 ? "+" : "*";
    const expression = `${a} ${sign} ${b}`;
    const result = eval(expression);

    return {
        expression: fakeNumbers(expression),
        result,
        id: ID++,
    };
}

function fakeNumbers(expression) {
    return expression
        .split(" ")
        .map((word) => `<span class="scale-0">999</span><span>${word}</span>`)
        .join(" ");
}

function getRandomNumber() {
    return Math.floor(Math.random() * 99);
}

server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
});

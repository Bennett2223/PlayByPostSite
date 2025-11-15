const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Example game state
let gameState = {
  players: {
    alice: { hp: 20, x: 1, y: 1 },
    bob: { hp: 20, x: 2, y: 2 }
  }
};

// WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send current state when someone connects
  ws.send(JSON.stringify(gameState));

  // Handle incoming messages
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "attack") {
      gameState.players[data.target].hp -= 5;
      broadcast(gameState);
    }

    if (data.type === "move") {
      const player = gameState.players[data.player];
      player.x = data.x;
      player.y = data.y;
      broadcast(gameState);
    }
  });
});

function broadcast(state) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(state));
    }
  });
}

server.listen(4000, () => console.log("Server running on http://localhost:4000"));

const express = require("express");
const http    = require("http");

// Socket.io wraps the http server and handles all real-time connections.
// We destructure "Server" from the package since that's what we need.
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);

// Initialize Socket.io on top of our http server.
// The cors setting is required in development because the React app runs
// on port 3000 and the backend runs on port 4000 — different ports count
// as different "origins" and browsers will block the connection without this.
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Stores the chat history for each game in memory.
// Shape: { "gameId123": [ message, message, ... ], "gameId456": [...] }
// When the real database is added, this gets replaced by DB reads/writes.
const gameMessages = {};

// Tracks every connected socket and who it belongs to.
// Shape: { "socketId": { userId, authorName, gameId, role } }
// We need this to find specific sockets for whisper routing.
const connectedClients = new Map();

// Builds a list of everyone currently connected to a specific game.
// excludeSocketId lets us leave out the person we're sending it to
// so they don't see themselves as a whisper target.
function getPlayersInGame(gameId, excludeSocketId = null) {
  const players = [];
  for (const [socketId, data] of connectedClients.entries()) {
    if (data.gameId === gameId && socketId !== excludeSocketId) {
      players.push({ authorName: data.authorName, role: data.role });
    }
  }
  return players;
}

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // ── join-game ──────────────────────────────────────────────────────────
  // The frontend sends this immediately after connecting.
  // It tells the server which game room to put this socket in,
  // and who this person is.
  socket.on("join-game", ({ gameId, userId, authorName, role }) => {

    // Socket.io "rooms" are like channels — messages sent to a room
    // only go to sockets that have joined that room.
    // This means game A's chat never leaks into game B.
    socket.join(gameId);

    // Remember who this socket belongs to so we can route whispers.
    connectedClients.set(socket.id, { userId, authorName, gameId, role });

    console.log(`${authorName} (${role}) joined game ${gameId}`);

    // Send the full message history so the new player can see
    // everything that was said before they connected.
    const history = gameMessages[gameId] || [];

    // Filter history so players only receive messages they're allowed to see.
    // A client can see a whisper only if they sent it or were the target of it.
    // All other message types (chat, story, ask-dm) are visible to everyone.
    const filteredHistory = history.filter(msg => {
      if (msg.type !== "whisper") return true;
      if (role === "dm") return true;  // DMs see all whispers in history
      return msg.author === authorName || msg.target === authorName;
    });

    socket.emit("chat-history", filteredHistory);
    io.to(gameId).emit("players-updated", getPlayersInGame(gameId));
  });

  // ── send-message ───────────────────────────────────────────────────────
  // Fired when a player sends a message from ChatPanel.
  socket.on("send-message", (message) => {
    const client = connectedClients.get(socket.id);

    // Ignore messages from sockets that haven't joined a game yet.
    if (!client) return;

    const { gameId } = client;

    // Build the complete message server-side.
    // Generating the timestamp and id here ensures every client
    // sees exactly the same values rather than their local clock.
    const fullMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], {
        hour:   "2-digit",
        minute: "2-digit"
      }),
    };

    // Store in history so players who join later can see it.
    if (!gameMessages[gameId]) gameMessages[gameId] = [];
    gameMessages[gameId].push(fullMessage);

    if (message.type === "whisper") {
      //send messages to DM and the target player only
      for (const [socketId, data] of connectedClients.entries()) {
        if (data.gameId === gameId && (
          data.authorName === message.target || // intended recipient
          data.role === "dm"                    // DM always sees whispers
        )) {
          io.to(socketId).emit("new-message", fullMessage);
        }
      }
      // Send back to sender (unless they're the DM, who was already caught above)
      if (client.role !== "dm") {
        socket.emit("new-message", fullMessage);
      }
    } else {
      // All other types (chat, ask-dm, story) go to everyone in the game room.
      io.to(gameId).emit("new-message", fullMessage);
    }
  });

  // ── disconnect ─────────────────────────────────────────────────────────
  // Fires automatically when a browser tab closes or loses connection.
  socket.on("disconnect", () => {
  const client = connectedClients.get(socket.id);
  if (client) {
    console.log(`${client.authorName} disconnected from game ${client.gameId}`);
    connectedClients.delete(socket.id);

    // Broadcast the updated player list so everyone's dropdown
    // immediately removes the person who just left.
    io.to(client.gameId).emit(
      "players-updated",
      getPlayersInGame(client.gameId)
    );
  }
});
});

server.listen(4000, () => console.log("Server running on http://localhost:4000"));
const express         = require("express");
const http            = require("http");
const cors            = require("cors");
const { Server }      = require("socket.io");
const jwt             = require("jsonwebtoken");
const db              = require("./database/db");
const { JWT_SECRET }  = require("./middleware/authMiddleware");

const authRouter       = require("./routes/auth");
const gamesRouter      = require("./routes/games");
const charactersRouter = require("./routes/characters");

const app    = express();
const server = http.createServer(app);

// ── Express setup ──────────────────────────────────────────────────────────

// Allow requests from the React dev server
app.use(cors({ origin: "http://localhost:3000" }));

// Parse incoming JSON request bodies
app.use(express.json());

// Mount API routes
app.use("/api/auth",       authRouter);
app.use("/api/games",      gamesRouter);
app.use("/api/characters", charactersRouter);

// Serve item and enemy JSON files from the content folder.
// A frontend fetch to /content/items/ancient-tome.json will return that file.
app.use("/content", express.static("content"));

// ── Socket.io setup ────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin:  "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Tracks connected sockets: { socketId → { userId, authorName, gameId, role } }
const connectedClients = new Map();

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

  socket.on("join-game", ({ gameId, userId, authorName, role }) => {
    socket.join(gameId);
    connectedClients.set(socket.id, { userId, authorName, gameId, role });
    console.log(`${authorName} (${role}) joined game ${gameId}`);

    // Load full message history from the database.
    // Filter whispers so players only see their own.
    const allMessages = db.prepare(
      "SELECT * FROM messages WHERE game_id = ? ORDER BY created_at ASC"
    ).all(gameId);

    const filteredHistory = allMessages.filter(msg => {
      if (msg.type !== "whisper") return true;
      if (role === "dm")          return true;
      return msg.author === authorName || msg.target === authorName;
    });

    socket.emit("chat-history", filteredHistory);

    // Broadcast updated online list to everyone in the room
    io.to(gameId).emit("players-updated", getPlayersInGame(gameId));
  });

  socket.on("send-message", (message) => {
    const client = connectedClients.get(socket.id);
    if (!client) return;

    const { gameId } = client;

    const fullMessage = {
      ...message,
      id:        require("crypto").randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Persist to database so history survives server restarts
    db.prepare(`
      INSERT INTO messages (id, game_id, type, author, target, content, is_dm, timestamp)
      VALUES (@id, @game_id, @type, @author, @target, @content, @is_dm, @timestamp)
    `).run({
      id:       fullMessage.id,
      game_id:  gameId,
      type:     fullMessage.type,
      author:   fullMessage.author,
      target:   fullMessage.target || null,
      content:  fullMessage.content,
      is_dm:    fullMessage.isDM ? 1 : 0,
      timestamp: fullMessage.timestamp,
    });

    if (message.type === "whisper") {
      for (const [socketId, data] of connectedClients.entries()) {
        if (data.gameId === gameId && (
          data.authorName === message.target ||
          data.role === "dm"
        )) {
          io.to(socketId).emit("new-message", fullMessage);
        }
      }
      if (client.role !== "dm") {
        socket.emit("new-message", fullMessage);
      }
    } else {
      io.to(gameId).emit("new-message", fullMessage);
    }
  });

  socket.on("disconnect", () => {
    const client = connectedClients.get(socket.id);
    if (client) {
      console.log(`${client.authorName} disconnected from ${client.gameId}`);
      connectedClients.delete(socket.id);
      io.to(client.gameId).emit(
        "players-updated",
        getPlayersInGame(client.gameId)
      );
    }
  });
});

server.listen(4000, () => console.log("Server running on http://localhost:4000"));
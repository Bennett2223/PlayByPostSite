const express        = require("express");
const db             = require("../database/db");
const { verifyToken } = require("../middleware/authMiddleware");

const router     = express.Router();
const generateId = () => require("crypto").randomUUID();

const generateGameCode = () =>
  Math.random().toString(36).substr(2, 6).toUpperCase();

// All game routes require a valid token
router.use(verifyToken);

// ── GET /api/games ─────────────────────────────────────────────────────────
// Returns all games the logged-in user is part of, with their role attached.
router.get("/", (req, res) => {
  const games = db.prepare(`
    SELECT g.*, m.role
    FROM games g
    JOIN memberships m ON g.id = m.game_id
    WHERE m.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.user.id);

  res.json({ games });
});

// ── POST /api/games ────────────────────────────────────────────────────────
// Creates a new game. The creator automatically becomes the DM.
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: "Game name is required." });
  }

  const id   = generateId();
  const code = generateGameCode();

  db.prepare("INSERT INTO games (id, name, code, dm_id) VALUES (?, ?, ?, ?)")
    .run(id, name.trim(), code, req.user.id);

  // Add DM membership for the creator
  db.prepare("INSERT INTO memberships (user_id, game_id, role) VALUES (?, ?, 'dm')")
    .run(req.user.id, id);

  res.json({ game: { id, name: name.trim(), code, dmId: req.user.id, role: "dm" } });
});

// ── POST /api/games/join ───────────────────────────────────────────────────
// Joins an existing game by its 6-character code.
router.post("/join", (req, res) => {
  const { code } = req.body;
  if (!code?.trim()) {
    return res.status(400).json({ error: "Game code is required." });
  }

  const game = db.prepare("SELECT * FROM games WHERE code = ?")
    .get(code.trim().toUpperCase());

  if (!game) {
    return res.status(404).json({ error: "No game found with that code." });
  }
  // Prevent the DM from joining their own game as a player
  if (game.dm_id === req.user.id) {
    return res.status(400).json({ error: "You are the DM of this game." });
  }
  const existing = db.prepare(
    "SELECT * FROM memberships WHERE user_id = ? AND game_id = ?"
  ).get(req.user.id, game.id);

  if (existing) {
    return res.status(400).json({ error: "You are already in this game." });
  }

  db.prepare("INSERT INTO memberships (user_id, game_id, role) VALUES (?, ?, 'player')")
    .run(req.user.id, game.id);

  res.json({ game: { ...game, role: "player" } });
});

// ── GET /api/games/:gameId/members ─────────────────────────────────────────
// Returns all members of a game who have a chat identity.
// DMs use their username; players use their character name.
router.get("/:gameId/members", (req, res) => {
  const members = db.prepare(`
    SELECT
      u.id        AS userId,
      u.username,
      m.role,
      c.name      AS characterName,
      c.id        AS characterId       -- added so DM can grant items
    FROM memberships m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN characters c ON c.user_id = m.user_id AND c.game_id = m.game_id
    WHERE m.game_id = ?
  `).all(req.params.gameId);

  const result = members
    .map(m => ({
      userId:      m.userId,
      username:    m.username,
      role:        m.role,
      authorName:  m.role === "dm" ? m.username : m.characterName,
      characterId: m.characterId || null,
    }))
    .filter(m => m.authorName !== null);

  res.json({ members: result });
});

module.exports = router;
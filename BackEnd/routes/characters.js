const express         = require("express");
const db              = require("../database/db");
const { verifyToken } = require("../middleware/authMiddleware");

const router     = express.Router();
const generateId = () => require("crypto").randomUUID();

router.use(verifyToken);

// ── GET /api/characters/:gameId ────────────────────────────────────────────
// Returns the logged-in player's character for a specific game, or null.
router.get("/:gameId", (req, res) => {
  const character = db.prepare(
    "SELECT * FROM characters WHERE user_id = ? AND game_id = ?"
  ).get(req.user.id, req.params.gameId);

  res.json({ character: character || null });
});

// ── POST /api/characters ───────────────────────────────────────────────────
// Creates a new character for the logged-in player in a game.
router.post("/", (req, res) => {
  const { gameId, name, class: charClass, backstory } = req.body;

  if (!gameId || !name?.trim() || !charClass) {
    return res.status(400).json({ error: "gameId, name, and class are required." });
  }

  const id = generateId();

  db.prepare(`
    INSERT INTO characters (id, user_id, game_id, name, class, backstory)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, gameId, name.trim(), charClass, backstory?.trim() || "");

  res.json({ character: { id, userId: req.user.id, gameId, name: name.trim(), class: charClass, backstory } });
});

module.exports = router;
const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { v4: uuid } = require("crypto");
const db       = require("../database/db");
const { JWT_SECRET } = require("../middleware/authMiddleware");

const router = express.Router();

// Helper to generate a unique ID
const generateId = () => require("crypto").randomUUID();

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  // Check if username is already taken
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
  if (existing) {
    return res.status(400).json({ error: "That username is already taken." });
  }

  // Hash the password before storing it.
  // The "10" is the number of salt rounds — higher is more secure but slower.
  // 10 is a good balance for most applications.
  const passwordHash = bcrypt.hashSync(password, 10);
  const id           = generateId();

  db.prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)")
    .run(id, username.trim(), passwordHash);

  // Generate a JWT token so the user is automatically logged in after registering
  const token = jwt.sign({ id, username: username.trim() }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id, username: username.trim() } });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim());

  // compareSync checks the plain password against the stored hash
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({ token, user: { id: user.id, username: user.username } });
});

module.exports = router;
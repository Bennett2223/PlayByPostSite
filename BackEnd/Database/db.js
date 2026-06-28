const Database = require("better-sqlite3");
const path     = require("path");

// Opens (or creates) the database file next to this script.
// better-sqlite3 is synchronous — no callbacks or promises needed,
// which makes the code much easier to read and reason about.
const db = new Database(path.join(__dirname, "pbp.db"));

// WAL mode makes reads and writes faster and prevents locking issues
// when multiple connections happen at the same time.
db.pragma("journal_mode = WAL");

// ── Create tables if they don't exist yet ─────────────────────────────────
// Running this every time the server starts is safe — "IF NOT EXISTS"
// means it only creates the table the first time.

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password   TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    code       TEXT UNIQUE NOT NULL,
    dm_id      TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dm_id) REFERENCES users(id)
  );

  -- Tracks who is in which game and whether they are a player or DM.
  -- The combination of user_id + game_id is unique — you can't join twice.
  CREATE TABLE IF NOT EXISTS memberships (
    user_id   TEXT NOT NULL,
    game_id   TEXT NOT NULL,
    role      TEXT NOT NULL CHECK(role IN ('dm', 'player')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );

  CREATE TABLE IF NOT EXISTS characters (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL,
    game_id   TEXT NOT NULL,
    name      TEXT NOT NULL,
    class     TEXT NOT NULL,
    backstory TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id)
  );

  -- Persistent chat history. Whisper target stored in "target" column.
  -- is_dm flag lets us re-apply the gold DM styling when history loads.
  CREATE TABLE IF NOT EXISTS messages (
    id        TEXT PRIMARY KEY,
    game_id   TEXT NOT NULL,
    type      TEXT NOT NULL,
    author    TEXT NOT NULL,
    target    TEXT,
    content   TEXT NOT NULL,
    is_dm     INTEGER DEFAULT 0,
    timestamp TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id)
  );
`);

module.exports = db;
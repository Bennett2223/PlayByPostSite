const express = require("express");
const fs      = require("fs");
const path    = require("path");

const router   = express.Router();
const ITEMS_DIR = path.join(__dirname, "../content/items");

// ── GET /api/items ─────────────────────────────────────────────────────────
// Returns all item JSONs. Used by DMItemsScreen to browse available items.
router.get("/", (req, res) => {
  try {
    const files = fs.readdirSync(ITEMS_DIR).filter(f => f.endsWith(".json"));
    const items = files.map(f => JSON.parse(fs.readFileSync(path.join(ITEMS_DIR, f), "utf8")));
    res.json({ items });
  } catch {
    res.status(500).json({ error: "Failed to load items." });
  }
});

// ── GET /api/items/:id ─────────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  try {
    const p = path.join(ITEMS_DIR, `${req.params.id}.json`);
    res.json(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch {
    res.status(404).json({ error: "Item not found." });
  }
});

module.exports = router;
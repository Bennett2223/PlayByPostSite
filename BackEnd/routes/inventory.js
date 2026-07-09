const express        = require("express");
const fs             = require("fs");
const path           = require("path");
const db             = require("../database/db");
const { verifyToken } = require("../middleware/authMiddleware");

const router     = express.Router();
const generateId = () => require("crypto").randomUUID();

router.use(verifyToken);

// Helper: load item JSON from disk by id
function loadItem(itemId) {
  try {
    const p = path.join(__dirname, "../content/items", `${itemId}.json`);
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch { return null; }
}

// ── GET /api/inventory/:gameId ─────────────────────────────────────────────
// Returns the current player's full inventory with item data merged in.
router.get("/:gameId", (req, res) => {
  const character = db.prepare(
    "SELECT * FROM characters WHERE user_id = ? AND game_id = ?"
  ).get(req.user.id, req.params.gameId);

  if (!character) return res.status(404).json({ error: "No character found." });

  const rows = db.prepare(
    "SELECT * FROM character_inventory WHERE character_id = ? ORDER BY created_at ASC"
  ).all(character.id);

  // Merge the DB row with the full item JSON so the frontend has everything it needs
  const inventory = rows.map(row => ({
    ...row,
    itemData: loadItem(row.item_id),
  })).filter(row => row.itemData !== null); // skip items with missing JSON

  res.json({ inventory, character });
});

// ── POST /api/inventory/:gameId/add ───────────────────────────────────────
// Player picks up an item. Weight check happens on the frontend before this call.
router.post("/:gameId/add", (req, res) => {
  const { itemId } = req.body;
  const character  = db.prepare(
    "SELECT * FROM characters WHERE user_id = ? AND game_id = ? AND equipped = 0"
  ).get(req.user.id, req.params.gameId);

  if (!character) return res.status(404).json({ error: "No character found." });

  // If already owned, increment quantity instead of adding a duplicate
  const existing = db.prepare(
    "SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?"
  ).get(character.id, itemId);

  if (existing) {
    db.prepare(
      "UPDATE character_inventory SET quantity = quantity + 1 WHERE id = ?"
    ).run(existing.id);
    return res.json({ success: true, action: "incremented" });
  }

  const id = generateId();
  db.prepare(
    "INSERT INTO character_inventory (id, character_id, game_id, item_id) VALUES (?, ?, ?, ?)"
  ).run(id, character.id, req.params.gameId, itemId);

  res.json({ success: true, action: "added", id });
});

// ── POST /api/inventory/:gameId/grant ─────────────────────────────────────
// DM grants an item directly to a player character.
router.post("/:gameId/grant", (req, res) => {
  const { characterId, itemId } = req.body;

  // Only the DM can grant items
  const membership = db.prepare(
    "SELECT * FROM memberships WHERE user_id = ? AND game_id = ? AND role = 'dm'"
  ).get(req.user.id, req.params.gameId);

  if (!membership) return res.status(403).json({ error: "Only the DM can grant items." });

  const existing = db.prepare(
    "SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ? AND equipped = 0"
  ).get(characterId, itemId);


  
  if (existing) {
    db.prepare(
      "UPDATE character_inventory SET quantity = quantity + 1 WHERE id = ?"
    ).run(existing.id);
    return res.json({ success: true, action: "incremented" });
  }

  const id = generateId();
  db.prepare(
    "INSERT INTO character_inventory (id, character_id, game_id, item_id, granted_by) VALUES (?, ?, ?, ?, ?)"
  ).run(id, characterId, req.params.gameId, itemId, req.user.id);

  res.json({ success: true, id });
});

// ── PUT /api/inventory/:gameId/:inventoryId/equip ─────────────────────────
// Equip or unequip an item. The frontend passes the target slot and twoHanded flag.
router.put("/:gameId/:inventoryId/equip", (req, res) => {
  const { inventoryId } = req.params;
  const { slot, equip, twoHanded } = req.body;

  const character = db.prepare(
    "SELECT * FROM characters WHERE user_id = ? AND game_id = ?"
  ).get(req.user.id, req.params.gameId);

  if (!character) return res.status(404).json({ error: "No character found." });

  const invItem = db.prepare(
    "SELECT * FROM character_inventory WHERE id = ? AND character_id = ?"
  ).get(inventoryId, character.id);

  if (!invItem) return res.status(404).json({ error: "Item not found in inventory." });

  if (equip) {
    // Check if target slot is already occupied
    const slotOccupied = db.prepare(
        "SELECT * FROM character_inventory WHERE character_id = ? AND equipped_slot = ? AND equipped = 1"
    ).get(character.id, slot);

    if (slotOccupied) {
        return res.status(400).json({ error: `Your ${slot} slot is already occupied.` });
    }

    if (twoHanded) {
        const offHandOccupied = db.prepare(
        "SELECT * FROM character_inventory WHERE character_id = ? AND equipped_slot = 'off-hand' AND equipped = 1"
        ).get(character.id);
        if (offHandOccupied) {
        return res.status(400).json({ error: "Unequip your off-hand item first." });
        }
    }

    if (invItem.quantity > 1) {
        // Split one off the stack — decrement the original and create
        // a new single-item entry that is equipped.
        // This way the unequipped stack and equipped item are tracked separately.
        db.prepare(
        "UPDATE character_inventory SET quantity = quantity - 1 WHERE id = ?"
        ).run(inventoryId);

        const newId = require("crypto").randomUUID();
        db.prepare(`
        INSERT INTO character_inventory
            (id, character_id, game_id, item_id, quantity, equipped, equipped_slot, granted_by)
        VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        `).run(newId, character.id, req.params.gameId, invItem.item_id, slot, invItem.granted_by || null);

    } else {
        const result = db.prepare(
            "UPDATE character_inventory SET equipped = 0, equipped_slot = NULL WHERE id = ?"
        ).run(inventoryId);

        // If no rows changed, the ID didn't match anything in the DB
        if (result.changes === 0) {
            return res.status(404).json({ error: "Item not found — nothing was changed." });
        }
    }
  }
  res.json({ success: true });
});

// ── DELETE /api/inventory/:gameId/:inventoryId ────────────────────────────
router.delete("/:gameId/:inventoryId", (req, res) => {
  const character = db.prepare(
    "SELECT * FROM characters WHERE user_id = ? AND game_id = ?"
  ).get(req.user.id, req.params.gameId);

  if (!character) return res.status(404).json({ error: "No character found." });

  const invItem = db.prepare(
    "SELECT * FROM character_inventory WHERE id = ? AND character_id = ?"
  ).get(req.params.inventoryId, character.id);

  if (!invItem) return res.status(404).json({ error: "Item not found." });

  if (invItem.quantity > 1) {
    // Drop one at a time — decrement the stack
    db.prepare(
      "UPDATE character_inventory SET quantity = quantity - 1 WHERE id = ?"
    ).run(req.params.inventoryId);
  } else {
    // Last one — remove the entry entirely
    db.prepare(
      "DELETE FROM character_inventory WHERE id = ? AND character_id = ?"
    ).run(req.params.inventoryId, character.id);
  }

  res.json({ success: true });
});

// ── GET /api/inventory/:gameId/party ──────────────────────────────────────
// DM only — returns all characters' inventories for the party tracker.
router.get("/:gameId/party", (req, res) => {
  const membership = db.prepare(
    "SELECT * FROM memberships WHERE user_id = ? AND game_id = ? AND role = 'dm'"
  ).get(req.user.id, req.params.gameId);

  if (!membership) return res.status(403).json({ error: "DM only." });

  const characters = db.prepare(
    "SELECT * FROM characters WHERE game_id = ?"
  ).all(req.params.gameId);

  const party = characters.map(char => {
    const rows = db.prepare(
      "SELECT * FROM character_inventory WHERE character_id = ?"
    ).all(char.id);
    return {
      character: char,
      inventory: rows.map(r => ({ ...r, itemData: loadItem(r.item_id) }))
                     .filter(r => r.itemData),
    };
  });

  res.json({ party });
});

module.exports = router;
import { useState } from "react";
import { RARITY_COLORS } from "../utils/equipmentSlots";
import "./ItemCard.css";

// ItemCard is used in two modes:
//   "inventory" — shown when hovering an item in InventoryScreen.
//                 Shows equip/unequip/drop buttons.
//   "browse"    — shown in DMItemsScreen when browsing all items.
//                 Shows a grant button.
export default function ItemCard({ item, inventoryEntry, mode = "inventory",
                                   onEquip, onUnequip, onDrop, onGrant, onAction }) {
  const [actionResult, setActionResult] = useState(null);

  if (!item) return null;

  const rarityColor = RARITY_COLORS[item.rarity?.toLowerCase()] || RARITY_COLORS.common;
  const equippable  = !!item.equipment?.slot;
  const isEquipped  = inventoryEntry?.equipped === 1;

  const handleAction = (action) => {
    // Show the result text for the action
    setActionResult({ label: action.label, text: action.result });

    // If the action is a pick-up, call the onAction callback
    // so the parent can add the item to inventory
    if (onAction) onAction(action, item);
  };

  return (
    <div className="item-card">

      {/* Image */}
      <div className="item-card-image">
        {item.image ? (
          <img
            src={`http://localhost:4000/content/items/images/${item.image}`}
            alt={item.name}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className="item-card-image-placeholder">🎒</div>
        )}
      </div>

      {/* Name and rarity */}
      <div className="item-card-header">
        <h3 className="item-card-name">{item.name}</h3>
        {item.rarity && (
          <span className="item-card-rarity" style={{ color: rarityColor }}>
            {item.rarity}
          </span>
        )}
      </div>

      {/* Tags */}
      {item.tags?.length > 0 && (
        <div className="item-card-tags">
          {item.tags.map(tag => (
            <span key={tag} className="item-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Description */}
      <p className="item-card-description">{item.description}</p>

      {/* Stats row */}
      <div className="item-card-stats">
        <span>⚖️ {item.weight ?? 0} lbs</span>
        {item.cost > 0 && <span>💰 {item.cost} gp</span>}
        {equippable && <span>📌 {item.equipment.slot}</span>}
        {item.requiresAttunement && <span>✨ Attunement</span>}
      </div>

      {/* Equipment modifiers */}
      {item.equipment?.modifiers?.length > 0 && (
        <div className="item-card-modifiers">
          {item.equipment.modifiers.map((mod, i) => (
            <span key={i} className="item-modifier">
              +{mod.value} {mod.stat}
            </span>
          ))}
        </div>
      )}

      {/* Action result message */}
      {actionResult && (
        <div className="item-action-result">
          <strong>{actionResult.label}:</strong> {actionResult.text}
          <button className="action-result-close"
                  onClick={() => setActionResult(null)}>✕</button>
        </div>
      )}

      {/* Actions from the item JSON */}
      {item.actions?.length > 0 && (
        <div className="item-card-actions">
          <p className="item-card-actions-label">Actions</p>
          {item.actions
            // Hide pick-up when the item is already in the inventory
            .filter(action => mode === "inventory" ? action.id !== "pick-up" : true)
            .map(action => (
            <button key={action.id} className="item-action-button"
                    onClick={() => handleAction(action)}>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Inventory mode buttons */}
      {mode === "inventory" && inventoryEntry && (
        <div className="item-card-buttons">
          {equippable && !isEquipped && (
            <button className="card-button equip-button"
                    onClick={() => onEquip(inventoryEntry, item)}>
              Equip
            </button>
          )}
          {isEquipped && (
            <button className="card-button unequip-button"
                    onClick={() => onUnequip(inventoryEntry)}>
              Unequip
            </button>
          )}
          <button className="card-button drop-button"
                  onClick={() => onDrop(inventoryEntry)}>
            Drop
          </button>
        </div>
      )}

      {/* Browse mode — DM grant button */}
      {mode === "browse" && onGrant && (
        <div className="item-card-buttons">
          <button className="card-button equip-button" onClick={() => onGrant(item)}>
            Grant to Player
          </button>
        </div>
      )}

    </div>
  );
}
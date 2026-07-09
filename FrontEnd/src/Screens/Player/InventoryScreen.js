import { useState, useEffect } from "react";
import * as api from "../../utils/api";
import {
  FIXED_SLOTS, FLEXIBLE_SLOT_TYPES,
  calculateCarryCapacity, calculateTotalWeight
} from "../../utils/equipmentSlots";
import ItemCard from "../../Components/ItemCard";
import "./InventoryScreen.css";

export default function InventoryScreen({ character, game }) {
  const [inventory,    setInventory]    = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // { inventoryEntry, itemData }
  const [message,      setMessage]      = useState(null); // { text, isError }
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!character || !game) return;
    loadInventory();
  }, [character?.id, game?.id]);

  const loadInventory = async () => {
    const data = await api.getInventory(game.id);
    setInventory(data.inventory || []);
    setLoading(false);
  };

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Equip ────────────────────────────────────────────────────────────────
  const handleEquip = async (inventoryEntry, itemData) => {
    const slot      = itemData.equipment?.slot;
    const twoHanded = itemData.equipment?.twoHanded || false;

    if (!slot) { showMessage("This item cannot be equipped.", true); return; }

    // For flexible slots (ring, tattoo, trinket), find the next available numbered slot
    const isFlexible = FLEXIBLE_SLOT_TYPES.some(s => s.id === slot);
    let targetSlot   = slot;

    if (isFlexible) {
      const slotType  = FLEXIBLE_SLOT_TYPES.find(s => s.id === slot);
      const maxSlots  = slotType.defaultCount; // TODO: increase with items/feats
      const occupied  = inventory.filter(i => i.equipped && i.equipped_slot?.startsWith(slot));

      if (occupied.length >= maxSlots) {
        showMessage(`All ${slot} slots are full.`, true);
        return;
      }
      // Ring slots become "ring-0", "ring-1" etc. to keep them distinct
      targetSlot = `${slot}-${occupied.length}`;
    }

    try {
      await api.equipItem(game.id, inventoryEntry.id, targetSlot, twoHanded);
      await loadInventory();
      setSelectedItem(null);
      showMessage(`${itemData.name} equipped.`);
    } catch (err) {
      showMessage(err.message, true);
    }
  };

  // ── Unequip ──────────────────────────────────────────────────────────────
  const handleUnequip = async (inventoryEntry) => {
    try {
      await api.unequipItem(game.id, inventoryEntry.id);
      await loadInventory();
      setSelectedItem(null);
      showMessage("Item unequipped.");
    } catch (err) {
      showMessage(err.message, true);
    }
  };

  // ── Drop ─────────────────────────────────────────────────────────────────
  const handleDrop = async (inventoryEntry) => {
    const qty = inventoryEntry.quantity > 1 ? ` (1 of ${inventoryEntry.quantity})` : "";
    if (!window.confirm(`Drop ${inventoryEntry.itemData?.name}${qty}?`)) return;
    try {
      await api.removeItem(game.id, inventoryEntry.id);
      await loadInventory();
      setSelectedItem(null);
      showMessage("Item dropped.");
    } catch (err) {
      showMessage(err.message, true);
    }
  };

  // ── Pick Up action trigger ────────────────────────────────────────────────
  const handleAction = async (action, item) => {
    if (action.id !== "pick-up") return;

    // Weight check before adding
    const weight   = calculateTotalWeight(inventory);
    const capacity = calculateCarryCapacity(character.strength_score, inventory);

    if (weight + (item.weight || 0) > capacity) {
      showMessage("It's too heavy! You can't carry any more.", true);
      return;
    }

    try {
      await api.addItemToInventory(game.id, item.id);
      await loadInventory();
      showMessage(`${item.name} added to inventory.`);
    } catch (err) {
      showMessage(err.message, true);
    }
  };

  // ── Derived weight values ─────────────────────────────────────────────────
  const totalWeight  = calculateTotalWeight(inventory);
  const capacity     = calculateCarryCapacity(character?.strength_score, inventory);
  const weightPct    = Math.min((totalWeight / capacity) * 100, 100);
  const isEncumbered = totalWeight > capacity;

  // ── Slot helpers ─────────────────────────────────────────────────────────
  const getItemInSlot = (slotId) =>
    inventory.find(i => i.equipped === 1 && i.equipped_slot === slotId) || null;

  const backpackItems = inventory.filter(i => !i.equipped);

  if (loading) return <div className="screen"><p>Loading inventory...</p></div>;

  return (
    <div className="inventory-screen">

      {/* ── Weight bar ── */}
      <div className="weight-bar-container">
        <div className="weight-label">
          <span>⚖️ {totalWeight.toFixed(1)} / {capacity} lbs</span>
          {isEncumbered && <span className="encumbered-warning">ENCUMBERED</span>}
        </div>
        <div className="weight-bar-track">
          <div
            className="weight-bar-fill"
            style={{
              width: `${weightPct}%`,
              backgroundColor: isEncumbered ? "#ff6b6b" : weightPct > 75 ? "#ffd700" : "#6bff9e"
            }}
          />
        </div>
      </div>

      {/* ── Toast message ── */}
      {message && (
        <div className={`inv-message ${message.isError ? "inv-msg-error" : "inv-msg-success"}`}>
          {message.text}
        </div>
      )}

      <div className="inventory-body">

        {/* ── Left: Equipment slots ── */}
        <div className="equipment-panel">
          <h3 className="panel-title">Equipped</h3>

          {/* Fixed slots */}
          <div className="slot-grid">
            {FIXED_SLOTS.map(slot => {
              const item = getItemInSlot(slot.id);
              return (
                <div
                  key={slot.id}
                  className={`equipment-slot ${item ? "slot-filled" : "slot-empty"}`}
                  onClick={() => item && setSelectedItem({ inventoryEntry: item, itemData: item.itemData })}
                >
                  <span className="slot-label">{slot.label}</span>
                  {item ? (
                    <span className="slot-item-name">{item.itemData.name}</span>
                  ) : (
                    <span className="slot-empty-text">—</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Flexible slots (rings, tattoos, trinkets) */}
          {FLEXIBLE_SLOT_TYPES.map(slotType => {
            if (slotType.defaultCount === 0) return null;
            const slots = Array.from({ length: slotType.defaultCount }, (_, i) => `${slotType.id}-${i}`);
            return (
              <div key={slotType.id} className="flexible-slot-group">
                <span className="flexible-slot-label">{slotType.label}s</span>
                <div className="flexible-slot-row">
                  {slots.map(slotId => {
                    const item = getItemInSlot(slotId);
                    return (
                      <div
                        key={slotId}
                        className={`flex-slot ${item ? "slot-filled" : "slot-empty"}`}
                        onClick={() => item && setSelectedItem({ inventoryEntry: item, itemData: item.itemData })}
                      >
                        {item ? item.itemData.name : "—"}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Middle: Backpack grid ── */}
        <div className="backpack-panel">
          <h3 className="panel-title">Backpack ({backpackItems.length} items)</h3>
          {backpackItems.length === 0 ? (
            <p className="empty-text">Your backpack is empty.</p>
          ) : (
            <div className="backpack-grid">
              {backpackItems.map(entry => (
                <div
                  key={entry.id}
                  className={`item-tile ${selectedItem?.inventoryEntry?.id === entry.id ? "item-tile-selected" : ""}`}
                  onClick={() => setSelectedItem({ inventoryEntry: entry, itemData: entry.itemData })}
                >
                  {/* Image or placeholder */}
                  <div className="item-tile-image">
                    {entry.itemData.image ? (
                      <img
                        src={`http://localhost:4000/content/items/images/${entry.itemData.image}`}
                        alt={entry.itemData.name}
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <span className="item-tile-placeholder">🎒</span>
                    )}
                  </div>
                  <span className="item-tile-name">{entry.itemData.name}</span>
                  {entry.quantity > 1 && (
                    <span className="item-tile-qty">×{entry.quantity}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Item detail card ── */}
        <div className="item-detail-panel">
          {selectedItem ? (
            <ItemCard
              item={selectedItem.itemData}
              inventoryEntry={selectedItem.inventoryEntry}
              mode="inventory"
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              onDrop={handleDrop}
              onAction={handleAction}
            />
          ) : (
            <div className="item-detail-empty">
              <p>Click an item to see details</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
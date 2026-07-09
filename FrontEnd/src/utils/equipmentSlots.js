// Single source of truth for all equipment slots.
// Import this in both InventoryScreen and the equip logic so they always agree.

// Fixed slots — every character has exactly one of each.
export const FIXED_SLOTS = [
  { id: "head",      label: "Head"      },
  { id: "eyes",      label: "Eyes"      },
  { id: "neck",      label: "Neck"      },
  { id: "chest",     label: "Chest"     },
  { id: "back",      label: "Back"      },
  { id: "wrists",    label: "Wrists"    },
  { id: "hands",     label: "Hands"     },
  { id: "waist",     label: "Waist"     },
  { id: "feet",      label: "Feet"      },
  { id: "main-hand", label: "Main Hand" },
  { id: "off-hand",  label: "Off Hand"  },
  { id: "container", label: "Container" },
];

// Flexible slots — characters have a configurable number of each.
// defaultCount can be increased by certain items or class features later.
export const FLEXIBLE_SLOT_TYPES = [
  { id: "ring",    label: "Ring",    defaultCount: 4 },
  { id: "tattoo",  label: "Tattoo",  defaultCount: 0 },
  { id: "trinket", label: "Trinket", defaultCount: 1 },
];

// Rarity colors used by ItemCard and item grids
export const RARITY_COLORS = {
  common:    "#aaa",
  uncommon:  "#1eff00",
  rare:      "#0070dd",
  "very rare": "#a335ee",
  legendary: "#ff8000",
};

// Carry weight calculation.
// Base = strength × 15 (D&D 5e standard).
// Equipped containers with a capacity value add to the limit.
export function calculateCarryCapacity(strengthScore, inventory) {
  const base = (strengthScore || 10) * 15;

  const containerBonus = inventory
    .filter(item =>
      item.equipped &&
      item.equipped_slot === "container" &&
      item.itemData?.equipment?.container?.capacity
    )
    .reduce((sum, item) => sum + item.itemData.equipment.container.capacity, 0);

  return base + containerBonus;
}

// Total weight of all items in the backpack and equipped slots.
// Items flagged as weightless (e.g. inside a bag of holding) are excluded.
export function calculateTotalWeight(inventory) {
  return inventory.reduce((sum, item) => {
    if (item.itemData?.equipment?.container?.weightless && item.equipped) return sum;
    return sum + (item.itemData?.weight || 0) * item.quantity;
  }, 0);
}
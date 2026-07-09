import { useState, useEffect } from "react";
import * as api from "../../utils/api";
import ItemCard from "../../Components/ItemCard";
import "./DMItemsScreen.css";

export default function DMItemsScreen({ game }) {
  const [allItems,    setAllItems]    = useState([]);
  const [members,     setMembers]     = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [grantTarget, setGrantTarget] = useState("");
  const [message,     setMessage]     = useState(null);
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    if (!game) return;

    api.getAllItems()
      .then(d => setAllItems(d.items || []))
      .catch(() => setAllItems([]));

    api.getGameMembers(game.id)
      .then(d => {
        const players = (d || []).filter(m => m.role === "player" && m.characterId);
        setMembers(players);
        if (players.length > 0) setGrantTarget(players[0].characterId);
      })
      .catch(() => setMembers([]));

  }, [game?.id]);

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleGrant = async (item) => {
    if (!grantTarget) { showMessage("Select a player first.", true); return; }
    try {
      await api.grantItem(game.id, grantTarget, item.id);
      const target = members.find(m => m.characterId === grantTarget);
      showMessage(`${item.name} granted to ${target?.authorName}.`);
      setSelectedItem(null);
    } catch (err) {
      showMessage(err.message, true);
    }
  };

  const filtered = (allItems || []).filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="dm-items-screen">

      {/* Header controls */}
      <div className="dm-items-header">
        <input
          className="dm-items-search"
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Player selector for granting */}
        <div className="grant-controls">
          <span className="grant-label">Grant to:</span>
          <select
            className="grant-select"
            value={grantTarget}
            onChange={(e) => setGrantTarget(e.target.value)}
          >
            {members.length === 0 ? (
              <option>No players yet</option>
            ) : (
              members.map(m => (
                <option key={m.characterId} value={m.characterId}>
                  ⚔️ {m.authorName}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {message && (
        <div className={`dm-items-message ${message.isError ? "inv-msg-error" : "inv-msg-success"}`}>
          {message.text}
        </div>
      )}

      <div className="dm-items-body">

        {/* Item list */}
        <div className="dm-item-list">
          {filtered.length === 0 ? (
            <p className="empty-text">No items found.</p>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className={`dm-item-row ${selectedItem?.id === item.id ? "dm-item-selected" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="dm-item-row-image">
                  {item.image ? (
                    <img
                      src={`http://localhost:4000/content/items/images/${item.image}`}
                      alt={item.name}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <span>🎒</span>
                  )}
                </div>
                <div className="dm-item-row-info">
                  <span className="dm-item-row-name">{item.name}</span>
                  <span className="dm-item-row-meta">
                    {item.rarity} · {item.weight ?? 0} lbs · {item.cost ?? 0} gp
                  </span>
                </div>
                <button
                  className="dm-grant-button"
                  onClick={(e) => { e.stopPropagation(); handleGrant(item); }}
                  disabled={!grantTarget || members.length === 0}
                >
                  Grant
                </button>
              </div>
            ))
          )}
        </div>

        {/* Item detail */}
        <div className="dm-item-detail">
          {selectedItem ? (
            <ItemCard
              item={selectedItem}
              mode="browse"
              onGrant={handleGrant}
            />
          ) : (
            <div className="item-detail-empty">
              <p>Select an item to preview</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
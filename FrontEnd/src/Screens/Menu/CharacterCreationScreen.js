import { useState } from "react";
import * as api from "../../utils/api";
import "./CharacterCreationScreen.css";

// Basic class options — easy to expand later
const CHARACTER_CLASSES = [
  "Barbarian", "Bard", "Cleric", "Druid",
  "Fighter", "Monk", "Paladin", "Ranger",
  "Rogue", "Sorcerer", "Warlock", "Wizard",
];

// user          — the logged-in user
// game          — the game they just joined
// onCharacterCreated — called with the new character so App.js can proceed
export default function CharacterCreationScreen({ user, game, onCharacterCreated }) {
  const [name,        setName]        = useState("");
  const [charClass,   setCharClass]   = useState(CHARACTER_CLASSES[0]);
  const [backstory,   setBackstory]   = useState("");
  const [error,       setError]       = useState("");

  const handleCreate = async () => {
    if (!name.trim()) { setError("Your character needs a name."); return; }
    try {
      const character = await api.createCharacter(game.id, {
        name: name.trim(), class: charClass, backstory: backstory.trim()
      });
      onCharacterCreated(character);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="char-create-screen">
      <div className="char-create-box">

        <h2 className="char-create-title">Create Your Character</h2>
        <p className="char-create-game">Joining: <strong>{game.name}</strong></p>

        <label className="char-label">Character Name</label>
        <input
          className="char-input"
          type="text"
          placeholder="e.g. Aria Swiftblade"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          autoFocus
        />

        <label className="char-label">Class</label>
        <select
          className="char-input"
          value={charClass}
          onChange={(e) => setCharClass(e.target.value)}
        >
          {CHARACTER_CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="char-label">Backstory <span className="optional">(optional)</span></label>
        <textarea
          className="char-input char-textarea"
          placeholder="A few sentences about your character's past..."
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          rows={4}
        />

        {error && <p className="char-error">{error}</p>}

        <button className="char-button" onClick={handleCreate}>
          Enter the World
        </button>

      </div>
    </div>
  );
}
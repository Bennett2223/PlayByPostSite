import { useState, useEffect } from "react";
import * as api from "../../utils/api";
import "./GamesDashboard.css";

// user       — the logged-in user object ({ id, username })
// onEnterGame — called when the user clicks a game card; receives the game object
// onLogout   — called when the user clicks Log Out
export default function GamesDashboard({ user, onEnterGame, onLogout }) {

  // Load this user's games on first render
  const [games, setGames] = useState([]);
  useEffect(() => {
    api.getGames().then(setGames);
  }, []);

  // Which action panel is open: null, "create", or "join"
  const [activePanel, setActivePanel] = useState(null);

  // Form values
  const [newGameName, setNewGameName] = useState("");
  const [joinCode,    setJoinCode]    = useState("");

  // Feedback message shown below the action buttons
  const [message, setMessage] = useState({ text: "", isError: false });

  const showMessage = (text, isError = false) => setMessage({ text, isError });

  const togglePanel = (panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
    setMessage({ text: "", isError: false });
  };

  const handleCreateGame = async () => {
    if (!newGameName.trim()) { showMessage("Please enter a game name.", true); return; }
    try {
      const game = await api.createGame(newGameName.trim());
      setGames(await api.getGames());
      setNewGameName("");
      setActivePanel(null);
      showMessage(`"${game.name}" created! Share this code: ${game.code}`);
    } catch (err) { showMessage(err.message, true); }
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim()) { showMessage("Please enter a game code.", true); return; }
    try {
      const game = await api.joinGame(joinCode.trim());
      setGames(await api.getGames());
      setJoinCode("");
      setActivePanel(null);
      showMessage(`Joined "${game.name}"! Create your character to get started.`);
    } catch (err) { showMessage(err.message, true); }
  };

  return (
    <div className="dashboard">

      {/* ── Header ── */}
      <div className="dashboard-header">
        <h1 className="dashboard-logo">⚔️ Play By Post</h1>
        <div className="dashboard-user-bar">
          <span className="dashboard-username">{user.username}</span>
          <button className="logout-button" onClick={onLogout}>Log Out</button>
        </div>
      </div>

      <div className="dashboard-body">

        {/* ── Action Buttons ── */}
        <div className="dashboard-actions">
          <button
            className={`action-button ${activePanel === "create" ? "action-active" : ""}`}
            onClick={() => togglePanel("create")}
          >
            + Create Game
          </button>
          <button
            className={`action-button ${activePanel === "join" ? "action-active" : ""}`}
            onClick={() => togglePanel("join")}
          >
            Join Game
          </button>
        </div>

        {/* Feedback message */}
        {message.text && (
          <p className={`dashboard-message ${message.isError ? "msg-error" : "msg-success"}`}>
            {message.text}
          </p>
        )}

        {/* ── Create Game Panel ── */}
        {activePanel === "create" && (
          <div className="dashboard-panel">
            <h3>New Game</h3>
            <p className="panel-hint">You will be the Dungeon Master. A join code will be generated automatically.</p>
            <div className="panel-row">
              <input
                className="panel-input"
                type="text"
                placeholder="Game name..."
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGame()}
                autoFocus
              />
              <button className="panel-button" onClick={handleCreateGame}>Create</button>
            </div>
          </div>
        )}

        {/* ── Join Game Panel ── */}
        {activePanel === "join" && (
          <div className="dashboard-panel">
            <h3>Join a Game</h3>
            <p className="panel-hint">Ask your Dungeon Master for the 6-character game code.</p>
            <div className="panel-row">
              <input
                className="panel-input"
                type="text"
                placeholder="Game code..."
                // toUpperCase keeps it consistent with how codes are stored
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
                autoFocus
              />
              <button className="panel-button" onClick={handleJoinGame}>Join</button>
            </div>
          </div>
        )}

        {/* ── Games List ── */}
        <h2 className="section-title">Your Games</h2>

        {games.length === 0 ? (
          <p className="no-games-text">
            You aren't part of any games yet. Create one or enter a code from your DM.
          </p>
        ) : (
          <div className="game-list">
            {games.map((game) => (
              <div
                key={game.id}
                className="game-card"
                onClick={() => onEnterGame(game)}
              >
                <div className="game-card-left">
                  <span className="game-name">{game.name}</span>
                  <span className="game-role">
                    {game.role === "dm" ? "👑 Dungeon Master" : "⚔️ Player"}
                  </span>
                </div>
                <div className="game-card-right">
                  {/* Only DMs see the join code, so they can share it */}
                  {game.role === "dm" && (
                    <span className="game-code">Code: {game.code}</span>
                  )}
                  <span className="enter-arrow">Enter →</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
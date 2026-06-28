import { useState } from "react";
import { mockDB } from "./utils/mockDB";

import TabBar                  from "./TabBar";
import ChatPanel               from "./Components/ChatPanel";
import LoginRegisterScreen     from "./Screens/Menu/LoginRegisterScreen";
import GamesDashboard           from "./Screens/Menu/GamesDashboard";
import CharacterCreationScreen from "./Screens/Menu/CharacterCreationScreen";

// Player screens
import InventoryScreen  from "./Screens/Player/InventoryScreen";
import CharacterScreen  from "./Screens/Player/CharacterScreen";
import LocalMapScreen   from "./Screens/Player/LocalMapScreen";
import GlobalMapScreen  from "./Screens/Player/GlobalMapScreen";

// DM screens
import DMPartyScreen    from "./Screens/DM/DMPartyScreen";
import DMEncounterScreen from "./Screens/DM/DMEncounterScreen";
import DMWorldMapScreen from "./Screens/DM/DMWorldMapScreen";
import DMItemsScreen    from "./Screens/DM/DMItemsScreen";

import "./App.css";

// Tab definitions for each role.
// Keeping them here makes it easy to add new tabs later.
const PLAYER_TABS = [
  { id: 1, label: "Inventory" },
  { id: 2, label: "Character" },
  { id: 3, label: "Local Map" },
  { id: 4, label: "Global Map" },
];

const DM_TABS = [
  { id: 1, label: "Party" },
  { id: 2, label: "Encounters" },
  { id: 3, label: "World Map" },
  { id: 4, label: "Items" },
];

function App() {
  const [activeTab, setActiveTab] = useState(1);

  // The currently logged-in user ({ id, username }), or null if not logged in.
  // We check localStorage on startup so the user stays logged in on refresh.
  const [user, setUser] = useState(() => mockDB.getCurrentUser());

  // The game the user has clicked into from the dashboard, or null.
  // Includes a "role" field: "dm" or "player".
  const [selectedGame, setSelectedGame] = useState(null);

  // The player's character in the selected game, or null.
  // DMs don't need a character, so this only matters for players.
  const [character, setCharacter] = useState(null);

  // All members of the current game who have a chat identity.
  // Passed to ChatPanel to populate the whisper dropdown.
  const [gameMembers, setGameMembers] = useState([]);

  // ── Event handlers ────────────────────────────────────

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    mockDB.logout();
    setUser(null);
    setSelectedGame(null);
    setCharacter(null);
  };

  // Called when the player clicks a game card on the dashboard.
  const handleEnterGame = (game) => {
    setSelectedGame(game);
    setActiveTab(1);

    // Load everyone in this game who has a chat identity
    setGameMembers(mockDB.getGameMembers(game.id));

    // If the user is a player, load their character for this game (if any).
    if (game.role === "player") {
      const existingCharacter = mockDB.getCharacter(user.id, game.id);
      setCharacter(existingCharacter);
    }
  };

  // Called when the player clicks "← Games" to return to the dashboard
  const handleLeaveGame = () => {
    setSelectedGame(null);
    setCharacter(null);
    setGameMembers([]);
    setActiveTab(1);
  };

  const handleCharacterCreated = (newCharacter) => {
    setCharacter(newCharacter);
  };

  // ── Routing ───────────────────────────────────────────

  // Step 1: Not logged in → show the login/register screen
  if (!user) {
    return <LoginRegisterScreen onLogin={handleLogin} />;
  }

  // Step 2: Logged in but no game selected → show the game dashboard
  if (!selectedGame) {
    return (
      <GamesDashboard
        user={user}
        onEnterGame={handleEnterGame}
        onLogout={handleLogout}
      />
    );
  }

  // Step 3: In a game as a player with no character → show character creation
  if (selectedGame.role === "player" && !character) {
    return (
      <CharacterCreationScreen
        user={user}
        game={selectedGame}
        onCharacterCreated={handleCharacterCreated}
      />
    );
  }

  // Step 4: In a game, identity resolved → show the main game layout
  const isDM   = selectedGame.role === "dm";
  const tabs   = isDM ? DM_TABS : PLAYER_TABS;

  const renderScreen = () => {
    if (isDM) {
      switch (activeTab) {
        case 1: return <DMPartyScreen />;
        case 2: return <DMEncounterScreen />;
        case 3: return <DMWorldMapScreen />;
        case 4: return <DMItemsScreen />;
        default: return <DMPartyScreen />;
      }
    } else {
      switch (activeTab) {
        case 1: return <InventoryScreen />;
        case 2: return <CharacterScreen />;
        case 3: return <LocalMapScreen />;
        case 4: return <GlobalMapScreen />;
        default: return <InventoryScreen />;
      }
    }
  };

  return (
    <div className="app-layout">
      <div className="left-panel">

        {/* Back button to return to the game dashboard */}
        <div className="game-header">
          <button className="leave-game-button" onClick={handleLeaveGame}>
            ← Games
          </button>
          <span className="game-title">{selectedGame.name}</span>
          <span className="game-role-badge">
            {isDM ? "👑 DM" : `⚔️ ${character?.name}`}
          </span>
        </div>

        <div className="screen-container">
          {renderScreen()}
        </div>

        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <ChatPanel
        user={user}
        character={character}
        game={selectedGame}
        gameMembers={gameMembers}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
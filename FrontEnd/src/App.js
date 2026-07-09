import { useState, useEffect } from "react";
import * as api from "./utils/api";

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
  const [activeTab,    setActiveTab]    = useState(1);
  const [user,         setUser]         = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [character,    setCharacter]    = useState(null);
  const [gameMembers,  setGameMembers]  = useState([]);

  // Show a loading screen while we check for a saved session.
  const [loading, setLoading] = useState(true);

  // On startup, check if there's a valid saved token.
  // If so, skip straight past the login screen.
  useEffect(() => {
    const savedUser = api.getCurrentUser();
    if (savedUser) setUser(savedUser);
    setLoading(false);
  }, []);

  const handleLogin = (loggedInUser) => setUser(loggedInUser);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setSelectedGame(null);
    setCharacter(null);
    setGameMembers([]);
  };

  const handleEnterGame = async (game) => {
    console.log("Entering game as:", game);  // add this line
    setSelectedGame(game);
    setActiveTab(1);

    // Load members from the database
    const members = await api.getGameMembers(game.id);
    setGameMembers(members);

    if (game.role === "player") {
      const existingCharacter = await api.getCharacter(game.id);
      setCharacter(existingCharacter);
    }
  };

  const handleLeaveGame = () => {
    setSelectedGame(null);
    setCharacter(null);
    setGameMembers([]);
    setActiveTab(1);
  };

  const handleCharacterCreated = () => {
    setSelectedGame(null);
    setCharacter(null);
  };

  // Brief loading state while we check localStorage for a saved session
  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                    height:"100vh", background:"#12121f", color:"#aaa" }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginRegisterScreen onLogin={handleLogin} />;
  }

  if (!selectedGame) {
    return (
      <GamesDashboard
        user={user}
        onEnterGame={handleEnterGame}
        onLogout={handleLogout}
      />
    );
  }

  if (selectedGame.role === "player" && !character) {
    return (
      <CharacterCreationScreen
        user={user}
        game={selectedGame}
        onCharacterCreated={handleCharacterCreated}
      />
    );
  }

  const isDM = selectedGame.role === "dm";
  const tabs = isDM ? DM_TABS : PLAYER_TABS;


  const renderScreen = () => {
    if (isDM) {
      switch (activeTab) {
        case 1: return <DMPartyScreen />;
        case 2: return <DMEncounterScreen />;
        case 3: return <DMWorldMapScreen />;
        case 4: return <DMItemsScreen game={selectedGame} />;
        default: return <DMPartyScreen />;
      }
    } else {
      switch (activeTab) {
        case 1: return <InventoryScreen character={character} game={selectedGame} />;
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
        <div className="game-header">
          <button className="leave-game-button" onClick={handleLeaveGame}>← Games</button>
          <span className="game-title">{selectedGame.name}</span>
          <span className="game-role-badge">
            {isDM ? "👑 DM" : `⚔️ ${character?.name}`}
          </span>
        </div>
        <div className="screen-container">{renderScreen()}</div>
        <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
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
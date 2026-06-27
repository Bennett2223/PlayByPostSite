import { useState } from "react";
import TabBar from "./TabBar";
import ChatPanel from "./Components/ChatPanel";
import InventoryScreen from "./PlayerScreens/InventoryScreen";
import CharacterScreen from "./PlayerScreens/CharacterScreen";
import LocalMapScreen from "./PlayerScreens/LocalMapScreen";
import GlobalMapScreen from "./PlayerScreens/GlobalMapScreen";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState(1);

  const renderScreen = () => {
    switch (activeTab) {
      case 1: return <LocalMapScreen />;
      case 2: return <InventoryScreen />;
      case 3: return <CharacterScreen />;
      case 4: return <GlobalMapScreen />;
      default: return <InventoryScreen />;
    }
  };

  return (
    // app-layout is a horizontal flex row — left panel and right panel side by side
    <div className="app-layout">

      {/* Left side: the tab content area + tab bar along the bottom */}
      <div className="left-panel">
        <div className="screen-container">
          {renderScreen()}
        </div>
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Right side: the chat panel, always visible regardless of active tab */}
      <ChatPanel />

    </div>
  );
}

export default App;
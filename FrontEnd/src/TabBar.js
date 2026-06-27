import "./TabBar.css";

const DEFAULT_TABS = [
  { id: 1, label: "Local Map" },
  { id: 2, label: "Inventory" },
  { id: 3, label: "Character" },
  { id: 4, label: "Global Map" },
];

// activeTab and onTabChange both come from App.js now.
// TabBar no longer manages any state of its own.
export default function TabBar({ activeTab, onTabChange }) {
  return (
    <div className="tab-bar">
      {DEFAULT_TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? "active" : ""}`}

          // When clicked, just tell App.js directly which tab was clicked.
          // App.js updates activeTab, which flows back down and highlights the right tab.
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
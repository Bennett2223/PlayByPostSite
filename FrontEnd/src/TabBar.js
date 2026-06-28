import "./TabBar.css";

// "tabs" is now passed in from App.js instead of hardcoded here.
// This means DMs and players can have completely different tab sets.
export default function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
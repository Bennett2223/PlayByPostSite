// useState lets us track the message list, the typed input,
// the selected message type, and the whisper target.
import { useState } from "react";
import "./ChatPanel.css";

// These are the types of messages a player can send.
// Each has an id used internally and a label shown on the button.
const MESSAGE_TYPES = [
  { id: "chat",     label: "Chat"    },
  { id: "whisper",  label: "Whisper" },
  { id: "ask-dm",   label: "Ask DM"  },
];

// Dummy messages so the panel isn't empty while you're building.
// Later these will be replaced by messages loaded from the backend.
const INITIAL_MESSAGES = [
  {
    id: 1,
    type: "story",
    author: "DM",
    content: "You stand at the entrance to the dungeon. The air is cold and smells of old stone.",
    timestamp: "10:00",
  },
  {
    id: 2,
    type: "chat",
    author: "Aria",
    content: "Ready when everyone else is.",
    timestamp: "10:01",
  },
  {
    id: 3,
    type: "whisper",
    author: "Gareth",
    target: "Aria",
    content: "I don't trust that merchant we met earlier.",
    timestamp: "10:02",
  },
  {
    id: 4,
    type: "ask-dm",
    author: "Aria",
    content: "Is there anything written above the dungeon entrance?",
    timestamp: "10:03",
  },
];

export default function ChatPanel() {

  // The full list of messages shown in the panel.
  // Starts with our dummy data above.
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  // Whatever the player has typed in the input box.
  const [inputText, setInputText] = useState("");

  // Which type of message the player is about to send.
  // Defaults to regular chat.
  const [selectedType, setSelectedType] = useState("chat");

  // Who a whisper is being sent to.
  // Only relevant when selectedType is "whisper".
  const [whisperTarget, setWhisperTarget] = useState("");

  // A simple counter for generating unique message ids.
  const [nextId, setNextId] = useState(INITIAL_MESSAGES.length + 1);

  // This runs when the player clicks Send (or presses Enter).
  const handleSend = () => {

    // Don't send empty messages.
    if (!inputText.trim()) return;

    // Don't send a whisper without a target name.
    if (selectedType === "whisper" && !whisperTarget.trim()) return;

    // Get the current time formatted as HH:MM for the timestamp.
    const now = new Date();
    const timestamp = now.getHours().toString().padStart(2, "0") + ":" +
                      now.getMinutes().toString().padStart(2, "0");

    // Build the new message object.
    const newMessage = {
      id: nextId,
      type: selectedType,
      author: "You",           // TODO: replace with the logged-in character's name later
      target: whisperTarget,   // Only used for whispers
      content: inputText,
      timestamp,
    };

    // Add it to the message list.
    // "...messages" keeps all existing messages and adds the new one at the end.
    setMessages([...messages, newMessage]);

    // TODO: When the backend is ready, send the message over WebSocket here
    // so all connected players receive it in real time.
    // Example: socket.emit("chat-message", newMessage);

    // Clear the input box after sending.
    setInputText("");
    setNextId(nextId + 1);
  };

  // Allow pressing Enter to send instead of clicking the button.
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  // Decides which CSS class a message gets based on its type.
  // Each type has different colors/styles defined in ChatPanel.css.
  const getMessageClass = (type) => {
    switch (type) {
      case "story":   return "message message-story";
      case "chat":    return "message message-chat";
      case "whisper": return "message message-whisper";
      case "ask-dm":  return "message message-ask-dm";
      default:        return "message";
    }
  };

  return (
    <div className="chat-panel">

      {/* ── Header ── */}
      <div className="chat-header">
        Story &amp; Chat
      </div>

      {/* ── Message list ── 
          This area scrolls when messages overflow.
          Each message is styled differently based on its type. */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={getMessageClass(msg.type)}>

            {/* Timestamp and author line */}
            <div className="message-header">
              <span className="message-timestamp">{msg.timestamp}</span>

              {/* Show the right label depending on message type */}
              {msg.type === "story" && (
                <span className="message-author dm-author">DM</span>
              )}
              {msg.type === "chat" && (
                <span className="message-author">{msg.author}</span>
              )}
              {msg.type === "whisper" && (
                <span className="message-author">
                  {msg.author} → {msg.target} <em>(whisper)</em>
                </span>
              )}
              {msg.type === "ask-dm" && (
                <span className="message-author">
                  {msg.author} <em>asks DM</em>
                </span>
              )}
            </div>

            {/* The message text itself */}
            <div className="message-content">{msg.content}</div>

          </div>
        ))}
      </div>

      {/* ── Input area ── */}
      <div className="chat-input-area">

        {/* Message type selector buttons */}
        <div className="message-type-buttons">
          {MESSAGE_TYPES.map((type) => (
            <button
              key={type.id}
              // Highlight whichever type is currently selected
              className={`type-button ${selectedType === type.id ? "type-active" : ""}`}
              onClick={() => setSelectedType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* "To:" input — only appears when Whisper is selected */}
        {selectedType === "whisper" && (
          <input
            className="whisper-target-input"
            type="text"
            placeholder="Whisper to..."
            value={whisperTarget}
            onChange={(e) => setWhisperTarget(e.target.value)}
          />
        )}

        {/* Main text input + send button */}
        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="send-button" onClick={handleSend}>
            Send
          </button>
        </div>

      </div>
    </div>
  );
}
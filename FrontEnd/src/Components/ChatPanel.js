// useEffect runs code when the component first appears on screen (and on cleanup).
// useRef stores a value (like the socket) without causing re-renders when it changes.
import { useState, useEffect, useRef } from "react";

// The client-side Socket.io library — connects to our backend server.
import { io } from "socket.io-client";

import "./ChatPanel.css";
// REPLACE the single MESSAGE_TYPES constant with two role-specific ones
const PLAYER_MESSAGE_TYPES = [
  { id: "chat",    label: "Chat"    },
  { id: "whisper", label: "Whisper" },
  { id: "ask-dm",  label: "Ask DM"  },
];

const DM_MESSAGE_TYPES = [
  { id: "story",   label: "Story"   },
  { id: "chat",    label: "Chat"    },
  { id: "whisper", label: "Whisper" },
];

export default function ChatPanel({ user, character, game, gameMembers, onLogout }) {

  // The list of messages shown in the panel.
  // Now comes from the server instead of being local-only.
  const [messages,      setMessages]      = useState([]);
  const [inputText,     setInputText]     = useState("");
  const [selectedType, setSelectedType] = useState(game.role === "dm" ? "story" : "chat");
  const [whisperTarget, setWhisperTarget] = useState("");


  // Whether we currently have a live connection to the backend.
  // Used to disable the input and show a status indicator.
  const [connected, setConnected] = useState(false);

  // useRef stores the socket object without triggering re-renders.
  // Think of it as a box we can put things in and read back later.
  const socketRef = useRef(null);

  // A ref attached to an invisible div at the bottom of the message list.
  // We use this to auto-scroll down when new messages arrive.
  const messagesEndRef = useRef(null);

  // The name shown in chat — character name for players, username for DM.
  const authorName = character ? character.name : user.username;

  
  // We no longer drive the whisper list from this —
  // it only powers the online/offline dot next to each name.
  const [onlineNames, setOnlineNames] = useState(new Set());

  useEffect(() => {
    const targets = gameMembers.filter(m => m.authorName !== authorName);
    const stillValid = targets.find(t => t.authorName === whisperTarget);
    if (!stillValid) {
        setWhisperTarget(targets[0]?.authorName || "");
    }
  }, [gameMembers]);



  // ── Socket setup ────────────────────────────────────────────────────────
  // This runs once when ChatPanel first mounts, and again if the game changes
  // (e.g. the user leaves one game and enters another).
  useEffect(() => {

    // Connect to the backend server.
    const socket = io("http://localhost:4000");
    socketRef.current = socket;

    // When the connection is established, tell the server who we are
    // and which game room we want to join.
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-game", {
        gameId:     game.id,
        userId:     user.id,
        authorName: authorName,
        role:       game.role,
      });
    });

    // The server sends the full chat history as soon as we join.
    // Replace whatever we have with the authoritative server version.
    socket.on("chat-history", (history) => {
      setMessages(history);
    });

    // A new message was broadcast by the server.
    // Add it to the end of our message list.
    socket.on("new-message", (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // The server sends this whenever someone joins or leaves the game.
    // We use it to keep the whisper dropdown up to date.
    socket.on("players-updated", (players) => {
        setOnlineNames(new Set(players.map(p => p.authorName)));
    });

    // Cleanup function — runs when the component unmounts or game.id changes.
    // Disconnecting here prevents ghost connections to the server.
    return () => {
      socket.disconnect();
    };

  }, [game.id]); // Only re-run this if the user switches to a different game

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  // Whenever the message list grows, scroll the panel to the bottom
  // so the newest message is always visible.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!inputText.trim()) return;
    if (selectedType === "whisper" && !whisperTarget) return;
    // Don't try to send if the socket isn't connected.
    if (!socketRef.current?.connected) return;

    // Send to the server — NOT directly to state.
    // The server will broadcast it back to everyone including us,
    // and that's when it gets added to our message list.
    // This ensures everyone sees messages in the same order.
    socketRef.current.emit("send-message", {
        type:    selectedType,
        author:  authorName,
        target:  whisperTarget,
        content: inputText,
        gameId:  game.id,
        isDM:    game.role === "dm",  // ← add this line
    });

    setInputText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

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
        <span>Story &amp; Chat</span>
        <div className="chat-header-player">
          {/* Green dot = connected, red dot = disconnected/reconnecting */}
          <span className={`connection-dot ${connected ? "dot-connected" : "dot-disconnected"}`} />
          <span>{game.role === "dm" ? "👑" : "⚔️"} {authorName}</span>
          <button className="switch-button" onClick={onLogout}>Switch</button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={getMessageClass(msg.type)}>
            <div className="message-header">
              <span className="message-timestamp">{msg.timestamp}</span>
              {msg.type === "story" && (
                <span className="message-author dm-author">DM</span>
              )}
              {msg.type === "chat" && (
                <span className={`message-author ${msg.isDM ? "dm-author" : ""}`}>
                    {msg.isDM ? "DM" : msg.author}
                </span>
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
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {/* Auto-scroll anchor — always stays at the bottom of the list */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="chat-input-area">

        <div className="message-type-buttons">
            {(game.role === "dm" ? DM_MESSAGE_TYPES : PLAYER_MESSAGE_TYPES).map((type) => (
            <button
              key={type.id}
              className={`type-button ${selectedType === type.id ? "type-active" : ""}`}
              onClick={() => setSelectedType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>

        {selectedType === "whisper" && (() => {
            // Everyone in the game except ourselves is a valid whisper target
            const targets = gameMembers.filter(m => m.authorName !== authorName);

            return targets.length === 0 ? (
                <p className="whisper-no-targets">No other players have joined yet.</p>
            ) : (
                <select
                className="whisper-target-select"
                value={whisperTarget}
                onChange={(e) => setWhisperTarget(e.target.value)}
                >
                {targets.map((p) => {
                    const isOnline = onlineNames.has(p.authorName);
                    return (
                    <option key={p.authorName} value={p.authorName}>
                        {p.role === "dm" ? "👑" : "⚔️"} {p.authorName}
                        {isOnline ? " (online)" : " (offline)"}
                    </option>
                    );
                })}
                </select>
            );
        })()}

        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            // The placeholder changes to show connection status
            placeholder={connected ? "Type a message..." : "Connecting to server..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!connected}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!connected}
          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}
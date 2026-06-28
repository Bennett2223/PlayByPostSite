import { useState } from "react";
import * as api from "../../utils/api";
import "./LoginRegisterScreen.css";

// onLogin is called with the user object when login or registration succeeds.
// App.js receives this and moves the user to the GameDashboard.
export default function LoginRegisterScreen({ onLogin }) {

  // Controls whether we show the login form or the register form
  const [mode, setMode] = useState("login"); // "login" or "register"

  const [username,        setUsername]        = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // only needed for register
  const [error,           setError]           = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    try {
      if (mode === "register") {
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        const user = await api.register(username.trim(), password);
        onLogin(user);
      } else {
        const user = await api.login(username.trim(), password);
        onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  // Switching modes clears the form and any error
  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="auth-screen">
      <div className="auth-box">

        <h1 className="auth-title">⚔️ Play By Post</h1>

        {/* Toggle between Log In and Create Account */}
        <div className="auth-toggle">
          <button
            className={`toggle-button ${mode === "login" ? "toggle-active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Log In
          </button>
          <button
            className={`toggle-button ${mode === "register" ? "toggle-active" : ""}`}
            onClick={() => switchMode("register")}
          >
            Create Account
          </button>
        </div>

        <input
          className="auth-input"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Third field only appears in register mode */}
        {mode === "register" && (
          <input
            className="auth-input"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-button" onClick={handleSubmit}>
          {mode === "login" ? "Log In" : "Create Account"}
        </button>

      </div>
    </div>
  );
}
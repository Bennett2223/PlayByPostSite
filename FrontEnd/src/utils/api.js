// The base URL for all API calls.
// When we deploy, this gets updated to the real server address.
const BASE_URL = "http://localhost:4000/api";

// ── Token management ───────────────────────────────────────────────────────

// Saves the JWT token to localStorage after login/register.
export const saveToken = (token) => localStorage.setItem("pbp_token", token);

// Reads the token back for attaching to requests.
export const getToken = () => localStorage.getItem("pbp_token");

// Clears the token on logout.
export const clearToken = () => localStorage.removeItem("pbp_token");

// Decodes the token payload without verifying it (verification happens on the server).
// Returns { id, username } or null.
export const getCurrentUser = () => {
  const token = getToken();
  if (!token) return null;
  try {
    // JWT tokens are three base64 sections separated by dots.
    // The middle section is the payload.
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Check if the token is expired client-side to avoid unnecessary requests
    if (payload.exp * 1000 < Date.now()) {
      clearToken();
      return null;
    }
    return { id: payload.id, username: payload.username };
  } catch {
    return null;
  }
};

// ── Helper: authenticated fetch ────────────────────────────────────────────

// Wraps fetch to automatically attach the token header and parse JSON.
// All API calls go through this function.
async function apiFetch(path, options = {}) {
  const token = getToken();
  const res   = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": token ? `Bearer ${token}` : "",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();

  // If the server returns an error, throw it so callers can handle it
  if (!res.ok) throw new Error(data.error || "Something went wrong.");

  return data;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function register(username, password) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body:   { username, password },
  });
  saveToken(data.token);
  return data.user;
}

export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body:   { username, password },
  });
  saveToken(data.token);
  return data.user;
}

export function logout() {
  clearToken();
}

// ── Games ──────────────────────────────────────────────────────────────────

export async function getGames() {
  const data = await apiFetch("/games");
  return data.games;
}

export async function createGame(name) {
  const data = await apiFetch("/games", {
    method: "POST",
    body:   { name },
  });
  return data.game;
}

export async function joinGame(code) {
  const data = await apiFetch("/games/join", {
    method: "POST",
    body:   { code },
  });
  return data.game;
}

export async function getGameMembers(gameId) {
  const data = await apiFetch(`/games/${gameId}/members`);
  return data.members;
}

// ── Characters ─────────────────────────────────────────────────────────────

export async function getCharacter(gameId) {
  const data = await apiFetch(`/characters/${gameId}`);
  return data.character; // null if not created yet
}

export async function createCharacter(gameId, characterData) {
  const data = await apiFetch("/characters", {
    method: "POST",
    body:   { gameId, ...characterData },
  });
  return data.character;
}
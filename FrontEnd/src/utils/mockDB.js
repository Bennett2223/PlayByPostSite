// ⚠️ THIS IS A DEVELOPMENT MOCK ONLY.
// Passwords are stored in plain text in localStorage.
// This is NOT acceptable for a real app.
// When the real backend is built, this entire file gets replaced
// by API calls and passwords will be hashed on the server.

// These are the keys we use to store data in localStorage.
// Prefixed with "pbp_" (play by post) to avoid conflicts with other sites.
const KEYS = {
  users:         "pbp_users",
  games:         "pbp_games",
  memberships:   "pbp_memberships",   // tracks who is in which game and as what role
  characters:    "pbp_characters",    // one character per user per game
  currentUserId: "pbp_currentUserId", // who is currently logged in
};

// Read a value from localStorage and parse it from JSON.
// Returns defaultValue if nothing is stored yet.
const read  = (key, defaultValue) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

// Write a value to localStorage, converting it to a JSON string.
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

// Generate a short random ID string for users, games, and characters.
const generateId = () => Math.random().toString(36).substr(2, 9);

// Generate a 6-character uppercase game code (e.g. "A3F9KD").
// Players use this to join a game.
const generateGameCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();


export const mockDB = {

  // ── Authentication ────────────────────────────────────

  // Returns the currently logged-in user object, or null if no one is logged in.
  getCurrentUser() {
    const userId = localStorage.getItem(KEYS.currentUserId);
    if (!userId) return null;
    const users = read(KEYS.users, []);
    const user = users.find(u => u.id === userId);
    // Return only safe fields — don't expose the password
    return user ? { id: user.id, username: user.username } : null;
  },

  // Create a new account. Returns { user } on success or { error } on failure.
  register(username, password) {
    const users = read(KEYS.users, []);
    // Check if the username is already taken (case-insensitive)
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { error: "That username is already taken." };
    }
    const newUser = { id: generateId(), username, password };
    write(KEYS.users, [...users, newUser]);
    // Log them in automatically after registering
    localStorage.setItem(KEYS.currentUserId, newUser.id);
    return { user: { id: newUser.id, username: newUser.username } };
  },

  // Log in to an existing account. Returns { user } on success or { error } on failure.
  login(username, password) {
    const users = read(KEYS.users, []);
    const user = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!user) return { error: "Incorrect username or password." };
    localStorage.setItem(KEYS.currentUserId, user.id);
    return { user: { id: user.id, username: user.username } };
  },

  // Log out by clearing the stored session.
  logout() {
    localStorage.removeItem(KEYS.currentUserId);
  },


  // ── Games ─────────────────────────────────────────────

  // Create a new game. The user who creates it becomes the DM automatically.
  createGame(name, userId) {
    const games       = read(KEYS.games,       []);
    const memberships = read(KEYS.memberships, []);
    const newGame = { id: generateId(), name, dmId: userId, code: generateGameCode() };
    write(KEYS.games,       [...games, newGame]);
    // Add a DM membership for the creator
    write(KEYS.memberships, [...memberships, { userId, gameId: newGame.id, role: "dm" }]);
    return { game: newGame };
  },

  // Join an existing game by code. Everyone who joins this way is a player.
  joinGame(code, userId) {
    const games = read(KEYS.games, []);
    const game  = games.find(g => g.code === code.toUpperCase());
    if (!game) return { error: "No game found with that code." };

    const memberships = read(KEYS.memberships, []);
    const alreadyIn   = memberships.find(m => m.userId === userId && m.gameId === game.id);
    if (alreadyIn) return { error: "You are already in this game." };

    write(KEYS.memberships, [...memberships, { userId, gameId: game.id, role: "player" }]);
    return { game };
  },

  // Returns all games a user is part of, each with a "role" field attached.
  getGamesForUser(userId) {
    const memberships = read(KEYS.memberships, []);
    const games       = read(KEYS.games,       []);
    return memberships
      .filter(m => m.userId === userId)
      .map(m => ({ ...games.find(g => g.id === m.gameId), role: m.role }));
  },

  // Returns the membership object for a user in a specific game, or null.
  getMembership(userId, gameId) {
    const memberships = read(KEYS.memberships, []);
    return memberships.find(m => m.userId === userId && m.gameId === gameId) || null;
  },


  // ── Characters ────────────────────────────────────────

  // Returns a player's character for a specific game, or null if they haven't made one.
  getCharacter(userId, gameId) {
    const characters = read(KEYS.characters, []);
    return characters.find(c => c.userId === userId && c.gameId === gameId) || null;
  },

  // Save a new character for a player in a game.
  createCharacter(userId, gameId, characterData) {
    const characters = read(KEYS.characters, []);
    const newChar = { id: generateId(), userId, gameId, ...characterData };
    write(KEYS.characters, [...characters, newChar]);
    return { character: newChar };
  },
    // Returns all members of a game who have a chat identity.
    // DMs use their username, players use their character name.
    // Members who joined but haven't created a character yet are excluded
    // since we don't know what name to whisper to.
    getGameMembers(gameId) {
        const memberships = read(KEYS.memberships, []);
        const users       = read(KEYS.users,       []);
        const characters  = read(KEYS.characters,  []);

        return memberships
            .filter(m => m.gameId === gameId)
            .map(m => {
            const user      = users.find(u => u.id === m.userId);
            const character = characters.find(
                c => c.userId === m.userId && c.gameId === gameId
            );
            // DMs have no character — they use their username in chat.
            // Players use their character name.
            const authorName = m.role === "dm"
                ? user?.username
                : character?.name || null;

            return {
                userId:     m.userId,
                username:   user?.username,
                role:       m.role,
                authorName, // null if player hasn't made a character yet
            };
        })
        // Drop anyone without a chat name yet
        .filter(m => m.authorName !== null);
    },

};




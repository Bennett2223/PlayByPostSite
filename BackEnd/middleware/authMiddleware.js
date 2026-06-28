const jwt = require("jsonwebtoken");

// This secret is used to sign and verify tokens.
// In production this should be a long random string stored in an .env file.
// For now it's hardcoded — we'll revisit this when we deploy.
const JWT_SECRET = "pbp-dev-secret-change-before-deploy";

// This middleware runs before any protected route handler.
// It reads the token from the request header, verifies it,
// and attaches the decoded user info to req.user.
// If the token is missing or invalid, it rejects the request immediately.
function verifyToken(req, res, next) {
  // Tokens are sent in the Authorization header as "Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token      = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach user info to the request so route handlers can use it
    req.user = decoded; // { id, username }
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

module.exports = { verifyToken, JWT_SECRET };
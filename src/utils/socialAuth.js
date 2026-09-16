const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const { OAuth2Client } = require("google-auth-library");
const env = require("../config/env");
const logger = require("../config/logger");
const { UnauthorizedError, ForbiddenError } = require("../errors/AppError");

const googleClient = new OAuth2Client();

function profileFromGooglePayload(payload) {
  if (!payload?.email) throw new UnauthorizedError("Google account has no email");
  // Google can issue a token for an unverified email (e.g. the user added it
  // to their Google account but never confirmed it) — unlike Apple, whose
  // token never even carries an email in that case, so this needs its own
  // explicit check rather than relying on the email-presence check above.
  if (payload.email_verified === false) throw new UnauthorizedError("Google account email is not verified");
  return {
    providerId: payload.sub,
    email: payload.email,
    firstName: payload.given_name || (payload.name || "Google").split(" ")[0],
    lastName: payload.family_name || (payload.name || "").split(" ").slice(1).join(" ") || "User",
  };
}

// Web (Google Identity Services) hands the frontend a ready-made id_token.
async function verifyGoogleIdToken(idToken) {
  if (!env.google.clientIds.length) throw new ForbiddenError("Google sign-in is not configured yet");

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({ idToken, audience: env.google.clientIds });
  } catch (err) {
    logger.warn("Google id_token verification failed", { error: err.message });
    throw new UnauthorizedError("Invalid Google sign-in token");
  }

  return profileFromGooglePayload(ticket.getPayload());
}

// Mobile (expo-auth-session, no native Google SDK available in this managed/
// Expo-Go project) instead does an authorization-code + PKCE flow and hands
// us the code — we exchange it for tokens here. No client secret needed:
// PKCE's codeVerifier is what proves possession, which is why this is safe
// for a public (native) OAuth client.
async function exchangeGoogleAuthCode({ code, redirectUri, codeVerifier, clientId }) {
  if (!env.google.clientIds.length) throw new ForbiddenError("Google sign-in is not configured yet");
  if (!clientId || !env.google.clientIds.includes(clientId)) throw new UnauthorizedError("Unrecognized Google client");

  const client = new OAuth2Client({ clientId, redirectUri });
  let tokens;
  try {
    ({ tokens } = await client.getToken({ code, codeVerifier }));
  } catch (err) {
    logger.warn("Google authorization code exchange failed", { error: err.message, redirectUri });
    throw new UnauthorizedError("Invalid Google authorization code");
  }
  if (!tokens.id_token) throw new UnauthorizedError("Google did not return an id_token");

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
  return profileFromGooglePayload(ticket.getPayload());
}

const appleJwks = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
});

function getAppleSigningKey(header, callback) {
  appleJwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

// Apple only includes the user's name in the client-side authorization
// response on their *first* sign-in, never in the id_token itself — callers
// must pass it through separately (see loginWithApple) if creating a new user.
async function verifyAppleIdToken(idToken) {
  if (!env.apple.clientIds.length) throw new ForbiddenError("Apple sign-in is not configured yet");

  let payload;
  try {
    payload = await new Promise((resolve, reject) => {
      jwt.verify(
        idToken,
        getAppleSigningKey,
        { algorithms: ["RS256"], issuer: "https://appleid.apple.com", audience: env.apple.clientIds },
        (err, decoded) => (err ? reject(err) : resolve(decoded))
      );
    });
  } catch (err) {
    logger.warn("Apple id_token verification failed", { error: err.message });
    throw new UnauthorizedError("Invalid Apple sign-in token");
  }

  if (!payload?.email) throw new UnauthorizedError("Apple account has no email");

  return {
    providerId: payload.sub,
    email: payload.email,
    // Apple sometimes sends this as the string "true" rather than a boolean.
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

module.exports = { verifyGoogleIdToken, exchangeGoogleAuthCode, verifyAppleIdToken };

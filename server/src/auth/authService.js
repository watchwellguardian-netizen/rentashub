import { createSignedToken, verifySignedToken } from "./tokenService.js";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "./password.js";
import { createSessionService } from "./sessionService.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_ALIASES = {
  user: "customer",
  guest: "customer",
  vendor: "supplier",
};
const ALLOWED_ROLES = new Set(["admin", "customer", "supplier", "broker"]);

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function authError(statusCode, code, message, details = []) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.publicMessage = message;
  error.details = details;
  return error;
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeRole(role = "customer") {
  const normalized = ROLE_ALIASES[String(role).toLowerCase()] || String(role).toLowerCase();
  return ALLOWED_ROLES.has(normalized) ? normalized : "customer";
}

async function findUserByEmail(usersRepository, email) {
  const matches = await usersRepository.list({ email: normalizeEmail(email) }, { includeDeleted: true });
  return matches[0] || null;
}

async function findUserById(usersRepository, id) {
  return usersRepository.findById(id);
}

export function createAuthService({ repositories, database, tokenOptions = {} }) {
  const sessions = createSessionService(database);

  async function issueToken(user, metadata = {}) {
    const { token, payload } = createSignedToken({ userId: user.id, role: user.role }, tokenOptions);
    await sessions.createSession({
      userId: user.id,
      tokenId: payload.tokenId,
      issuedAt: new Date(payload.iat * 1000).toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      metadata,
    });
    return { token, expiresAt: new Date(payload.exp * 1000).toISOString(), tokenId: payload.tokenId };
  }

  return {
    async register(input = {}) {
      const email = normalizeEmail(input.email);
      const name = String(input.name || "").trim();
      const role = normalizeRole(input.role);
      const errors = [];
      if (!name) errors.push({ field: "name", message: "Name is required." });
      if (!EMAIL_PATTERN.test(email)) errors.push({ field: "email", message: "Valid email is required." });
      const passwordPolicy = validatePasswordPolicy(input.password || "");
      for (const message of passwordPolicy.errors) errors.push({ field: "password", message });
      if (errors.length) throw authError(400, "validation_error", "Please correct the highlighted fields.", errors);

      const existing = await findUserByEmail(repositories.users, email);
      if (existing && !existing.deleted_at) throw authError(409, "duplicate_email", "An account with this email already exists.");

      const password = hashPassword(input.password);
      const user = await repositories.users.create({
        name,
        email,
        role,
        status: "active",
        password_hash: password.hash,
        password_salt: password.salt,
      });
      const token = await issueToken(user, { event: "register" });
      return { user: publicUser(user), ...token };
    },

    async login(input = {}) {
      const email = normalizeEmail(input.email);
      const user = await findUserByEmail(repositories.users, email);
      if (!user || !verifyPassword(input.password || "", user.password_salt, user.password_hash)) {
        throw authError(401, "invalid_credentials", "Email or password is incorrect.");
      }
      if (user.status !== "active") throw authError(403, "inactive_user", "This account is not active.");
      await repositories.users.update(user.id, { last_login_at: new Date().toISOString() });
      const updatedUser = await repositories.users.findById(user.id);
      const token = await issueToken(updatedUser, { event: "login" });
      return { user: publicUser(updatedUser), ...token };
    },

    async authenticateToken(token) {
      if (!token) throw authError(401, "missing_token", "Authentication token is required.");
      const verified = verifySignedToken(token, tokenOptions);
      if (!verified.valid) throw authError(401, verified.error, "Token is invalid or expired.");
      const session = await sessions.findActiveByTokenId(verified.payload.tokenId);
      if (!session) throw authError(401, "inactive_session", "Session is no longer active.");
      const user = await findUserById(repositories.users, verified.payload.userId);
      if (!user) throw authError(401, "unknown_user", "Token user was not found.");
      return { user: publicUser(user), tokenPayload: verified.payload, session };
    },

    async logout(token) {
      const verified = verifySignedToken(token, { ...tokenOptions, nowSeconds: 0 });
      if (!verified.valid || !verified.payload?.tokenId) return { loggedOut: true };
      await sessions.revokeToken(verified.payload.tokenId);
      return { loggedOut: true };
    },

    async refresh(token) {
      const authenticated = await this.authenticateToken(token);
      await sessions.revokeToken(authenticated.tokenPayload.tokenId);
      const nextToken = await issueToken(authenticated.user, { event: "refresh" });
      return { user: authenticated.user, ...nextToken };
    },
  };
}

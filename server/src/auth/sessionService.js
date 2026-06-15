import { createBaseRepository } from "../repositories/baseRepository.js";

function now() {
  return new Date().toISOString();
}

export function createSessionService(database) {
  const sessions = createBaseRepository(database, "auth_sessions", { idPrefix: "session", softDelete: false });

  return {
    async createSession({ userId, tokenId, issuedAt, expiresAt, metadata = {} }) {
      return sessions.create({
        user_id: userId,
        token_id: tokenId,
        status: "active",
        issued_at: issuedAt,
        expires_at: expiresAt,
        metadata_json: JSON.stringify(metadata),
      });
    },

    async findActiveByTokenId(tokenId) {
      const matches = await sessions.list({ token_id: tokenId });
      const session = matches.find((item) => item.status === "active" && !item.revoked_at);
      if (!session) return null;
      if (new Date(session.expires_at).getTime() <= Date.now()) {
        await sessions.update(session.id, { status: "expired" });
        return null;
      }
      return session;
    },

    async revokeToken(tokenId) {
      const matches = await sessions.list({ token_id: tokenId });
      const session = matches.find((item) => item.status === "active");
      if (!session) return null;
      return sessions.update(session.id, { status: "revoked", revoked_at: now() });
    },
  };
}

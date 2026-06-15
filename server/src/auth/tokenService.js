import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const DEFAULT_SECRET = "rentashub-development-token-secret-change-before-real-use";
const DEFAULT_TTL_SECONDS = 60 * 60;

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function sign(input, secret) {
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function createSignedToken(payload, { secret = process.env.AUTH_TOKEN_SECRET || DEFAULT_SECRET, ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    tokenId: randomUUID(),
    userId: payload.userId,
    role: payload.role,
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedHeader = base64UrlEncode({ alg: "HS256", typ: "RentasHubDevToken" });
  const encodedBody = base64UrlEncode(body);
  const signature = sign(`${encodedHeader}.${encodedBody}`, secret);
  return { token: `${encodedHeader}.${encodedBody}.${signature}`, payload: body };
}

export function verifySignedToken(token, { secret = process.env.AUTH_TOKEN_SECRET || DEFAULT_SECRET, nowSeconds = Math.floor(Date.now() / 1000) } = {}) {
  if (!token || typeof token !== "string") return { valid: false, error: "missing_token" };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, error: "invalid_token" };
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, error: "invalid_signature" };
  }
  try {
    const payload = base64UrlDecode(body);
    if (!payload.exp || payload.exp <= nowSeconds) return { valid: false, error: "expired_token", payload };
    return { valid: true, payload };
  } catch {
    return { valid: false, error: "invalid_payload" };
  }
}

import { getSupabaseAuthReadiness } from "./supabaseAuthReadiness.js";
import { getPermissionMatrix, normalizeRole } from "./rbacPolicy.js";

function decodeJwtPayload(token = "") {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function getSupabaseAuthActivationPlan(env = process.env) {
  const readiness = getSupabaseAuthReadiness(env);
  return {
    provider: "supabase",
    status: readiness.ready ? "credentials_present_pending_live_validation" : "credential_ready_blocked",
    readiness,
    sessionLifecycle: {
      login: "Supabase email/password sign-in returns access and refresh tokens.",
      refresh: "Refresh token rotation must be enabled and verified in Supabase Auth settings.",
      logout: "Frontend logout must revoke local session and call Supabase signOut.",
      passwordReset: "Password reset redirects must point to approved UAT/production domains.",
      emailVerification: "Email verification must be required before paid or privileged workflows.",
      sessionRevocation: "Admin/session revocation is required before public launch.",
    },
    rolePersistence: {
      source: "user_role_assignments",
      jwtClaim: "app_role",
      fallback: "server-side role lookup by Supabase auth user id",
      roles: getPermissionMatrix(),
    },
    mfa: {
      status: String(env.AUTH_MFA_READY || "false").toLowerCase() === "true" ? "ready_for_staging_validation" : "framework_placeholder",
      requiredBeforePublicLaunch: true,
    },
  };
}

export function validateSupabaseJwtReadiness(token = "", env = process.env) {
  const readiness = getSupabaseAuthReadiness(env);
  if (!readiness.credentialsReady) {
    return { valid: false, code: "supabase_credentials_missing", message: readiness.message };
  }
  const payload = decodeJwtPayload(token);
  if (!payload) return { valid: false, code: "invalid_jwt_shape", message: "Supabase JWT must have a valid three-part JWT structure." };
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp <= now) return { valid: false, code: "expired_jwt", message: "Supabase JWT is expired." };
  return {
    valid: true,
    code: "jwt_shape_valid_signature_not_verified",
    message: "JWT shape is valid. Signature verification requires Supabase JWT secret or SDK validation in live activation.",
    user: {
      id: payload.sub || "",
      email: payload.email || "",
      role: normalizeRole(payload.app_role || payload.role || "customer"),
    },
    payload,
  };
}

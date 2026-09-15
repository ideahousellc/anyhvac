import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "anyhvac_admin_session";
export const ADMIN_LOGIN_GUARD_COOKIE = "anyhvac_admin_login_guard";
export const SESSION_TTL_SECONDS = 30 * 60;

type SessionPayload = {
  exp: number;
  iat: number;
  nonce: string;
  v: 1;
};

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signature(value: string, secret: string, purpose: string) {
  return createHmac("sha256", secret)
    .update(`${purpose}.${value}`)
    .digest("base64url");
}

export function isSessionSecretUsable(secret: string | undefined): secret is string {
  return typeof secret === "string" && Buffer.byteLength(secret) >= 32;
}

export function signAdminValue(value: unknown, secret: string, purpose: string) {
  const encoded = encode(JSON.stringify(value));
  return `${encoded}.${signature(encoded, secret, purpose)}`;
}

export function verifyAdminValue<T>(
  token: string | undefined,
  secret: string | undefined,
  purpose: string,
): T | null {
  if (!token || !isSessionSecretUsable(secret)) return null;

  const separator = token.indexOf(".");
  if (separator <= 0 || separator !== token.lastIndexOf(".")) return null;

  const encoded = token.slice(0, separator);
  const supplied = token.slice(separator + 1);
  const expected = signature(encoded, secret, purpose);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function createAdminSession(secret: string, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000);
  const payload: SessionPayload = {
    v: 1,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
    nonce: randomBytes(18).toString("base64url"),
  };
  return signAdminValue(payload, secret, "session");
}

export function verifyAdminSession(
  token: string | undefined,
  secret = process.env.ADMIN_SESSION_SECRET,
  now = Date.now(),
) {
  const payload = verifyAdminValue<SessionPayload>(token, secret, "session");
  if (!payload) return false;

  const nowSeconds = Math.floor(now / 1000);
  return (
    payload.v === 1 &&
    Number.isInteger(payload.iat) &&
    Number.isInteger(payload.exp) &&
    typeof payload.nonce === "string" &&
    payload.nonce.length >= 16 &&
    payload.iat <= nowSeconds + 30 &&
    payload.exp > nowSeconds &&
    payload.exp - payload.iat === SESSION_TTL_SECONDS
  );
}

export function getAdminSessionExpiration(
  token: string | undefined,
  secret = process.env.ADMIN_SESSION_SECRET,
  now = Date.now(),
) {
  if (!verifyAdminSession(token, secret, now)) return null;
  const payload = verifyAdminValue<SessionPayload>(token, secret, "session");
  return payload ? payload.exp * 1000 : null;
}

export function getAdminSessionMetadata(
  token: string | undefined,
  secret = process.env.ADMIN_SESSION_SECRET,
  now = Date.now(),
) {
  const expiresAt = getAdminSessionExpiration(token, secret, now);
  return expiresAt === null ? null : { expiresAt, serverNow: now };
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
  priority: "high" as const,
};

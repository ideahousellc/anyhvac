import { createHash, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";

const DUMMY_PIN_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9VQEH7n8MTRBHxY5qDnJcS2lVhNhF6u";

function safeStringEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function isAdminAuthConfigured() {
  return Boolean(
    process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PIN_HASH &&
      process.env.ADMIN_SESSION_SECRET,
  );
}

export async function authenticateAdmin(username: unknown, pin: unknown) {
  const suppliedUsername = typeof username === "string" ? username.trim() : "";
  const suppliedPin = typeof pin === "string" ? pin : "";
  const configuredUsername = process.env.ADMIN_USERNAME ?? "";
  const configuredHash = process.env.ADMIN_PIN_HASH ?? DUMMY_PIN_HASH;

  const usernameMatches = safeStringEqual(suppliedUsername, configuredUsername);
  let pinMatches = false;
  try {
    pinMatches = await bcrypt.compare(suppliedPin, configuredHash);
  } catch {
    await bcrypt.compare(suppliedPin, DUMMY_PIN_HASH);
  }

  return /^\d{6}$/.test(suppliedPin) && usernameMatches && pinMatches;
}

import { signAdminValue, verifyAdminValue } from "@/lib/admin/session";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_BEFORE_COOLDOWN = 5;
const BASE_COOLDOWN_MS = 30 * 1000;
const MAX_COOLDOWN_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 2_000;

type AttemptState = {
  blockedUntil: number;
  failures: number;
  windowStartedAt: number;
};

const globalForAdminRateLimit = globalThis as typeof globalThis & {
  adminLoginAttempts?: Map<string, AttemptState>;
};

const attempts =
  globalForAdminRateLimit.adminLoginAttempts ?? new Map<string, AttemptState>();
globalForAdminRateLimit.adminLoginAttempts = attempts;

function parseGuard(token: string | undefined, secret: string): AttemptState | null {
  const guard = verifyAdminValue<AttemptState>(token, secret, "login-guard");
  if (
    !guard ||
    !Number.isInteger(guard.failures) ||
    !Number.isFinite(guard.blockedUntil) ||
    !Number.isFinite(guard.windowStartedAt)
  ) {
    return null;
  }
  return guard;
}

function activeState(state: AttemptState | null, now: number) {
  return state && now - state.windowStartedAt < WINDOW_MS ? state : null;
}

function strongestState(
  memory: AttemptState | null,
  cookie: AttemptState | null,
  now: number,
): AttemptState | null {
  const candidates = [activeState(memory, now), activeState(cookie, now)].filter(
    (entry): entry is AttemptState => entry !== null,
  );
  if (!candidates.length) return null;
  return candidates.reduce((strongest, entry) =>
    entry.failures > strongest.failures ? entry : strongest,
  );
}

function cleanup(now: number) {
  if (attempts.size <= MAX_ENTRIES) return;
  for (const [key, value] of attempts) {
    if (now - value.windowStartedAt >= WINDOW_MS) attempts.delete(key);
  }
  while (attempts.size > MAX_ENTRIES) {
    const oldestKey = attempts.keys().next().value as string | undefined;
    if (!oldestKey) break;
    attempts.delete(oldestKey);
  }
}

export function checkLoginLimit(
  key: string,
  guardToken: string | undefined,
  secret: string,
  now = Date.now(),
) {
  const state = strongestState(attempts.get(key) ?? null, parseGuard(guardToken, secret), now);
  return { limited: Boolean(state && state.blockedUntil > now), state };
}

export function recordLoginFailure(
  key: string,
  guardToken: string | undefined,
  secret: string,
  now = Date.now(),
) {
  cleanup(now);
  const current = strongestState(
    attempts.get(key) ?? null,
    parseGuard(guardToken, secret),
    now,
  );
  const failures = (current?.failures ?? 0) + 1;
  const cooldownExponent = Math.max(0, failures - MAX_FAILURES_BEFORE_COOLDOWN);
  const cooldown =
    failures >= MAX_FAILURES_BEFORE_COOLDOWN
      ? Math.min(BASE_COOLDOWN_MS * 2 ** cooldownExponent, MAX_COOLDOWN_MS)
      : 0;
  const state: AttemptState = {
    failures,
    windowStartedAt: current?.windowStartedAt ?? now,
    blockedUntil: cooldown ? now + cooldown : 0,
  };
  attempts.set(key, state);
  return {
    limited: state.blockedUntil > now,
    token: signAdminValue(state, secret, "login-guard"),
  };
}

export function clearLoginLimit(key: string) {
  attempts.delete(key);
}

export function resetLoginLimitsForTests() {
  attempts.clear();
}

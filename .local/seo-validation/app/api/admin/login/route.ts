import { type NextRequest, NextResponse } from "next/server";

import { authenticateAdmin, isAdminAuthConfigured } from "@/lib/admin/auth";
import {
  checkLoginLimit,
  clearLoginLimit,
  recordLoginFailure,
} from "@/lib/admin/rate-limit";
import {
  getClientKey,
  isSameOrigin,
  NO_STORE_HEADERS,
} from "@/lib/admin/request-security";
import {
  ADMIN_LOGIN_GUARD_COOKIE,
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSession,
  isSessionSecretUsable,
} from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_048;

function response(message: string, status: number) {
  return NextResponse.json(
    { authenticated: false, error: message },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return response("Request not allowed.", 403);

  if (!isAdminAuthConfigured()) {
    console.error("Admin authentication is not fully configured.");
    return response("Admin sign-in is unavailable.", 503);
  }

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!isSessionSecretUsable(secret)) {
    console.error("ADMIN_SESSION_SECRET must contain at least 32 bytes.");
    return response("Admin sign-in is unavailable.", 503);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return response("Invalid sign-in request.", 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return response("Invalid sign-in request.", 413);
  }

  const key = getClientKey(request, secret);
  const guardToken = request.cookies.get(ADMIN_LOGIN_GUARD_COOKIE)?.value;
  if (checkLoginLimit(key, guardToken, secret).limited) {
    return response("Too many attempts. Try again later.", 429);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return response("Invalid sign-in request.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  const values =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const shapeIsValid =
    Object.keys(values).every((keyName) => ["username", "pin"].includes(keyName)) &&
    typeof values.username === "string" &&
    typeof values.pin === "string";
  const authenticated =
    shapeIsValid && (await authenticateAdmin(values.username, values.pin));

  if (!authenticated) {
    const result = recordLoginFailure(key, guardToken, secret);
    const invalidResponse = response(
      result.limited ? "Too many attempts. Try again later." : "Invalid username or PIN.",
      result.limited ? 429 : 401,
    );
    invalidResponse.cookies.set(ADMIN_LOGIN_GUARD_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60,
      priority: "high",
    });
    return invalidResponse;
  }

  clearLoginLimit(key);
  const success = NextResponse.json(
    { authenticated: true },
    { headers: NO_STORE_HEADERS },
  );
  success.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSession(secret),
    adminSessionCookieOptions,
  );
  success.cookies.set(ADMIN_LOGIN_GUARD_COOKIE, "", {
    ...adminSessionCookieOptions,
    maxAge: 0,
  });
  return success;
}

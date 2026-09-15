import { type NextRequest, NextResponse } from "next/server";

import {
  ADMIN_FROM,
  ADMIN_REPLY_TO,
  createAdminEmailContent,
  validateAdminMail,
} from "@/lib/admin/mail";
import { isSameOrigin, NO_STORE_HEADERS } from "@/lib/admin/request-security";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 14_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function response(message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json(
    { delivered: false, error: message, ...(fields ? { fields } : {}) },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!verifyAdminSession(session)) return response("Authentication required.", 401);
  if (!isSameOrigin(request)) return response("Request not allowed.", 403);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return response("Invalid mail request.", 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return response("Mail request is too large.", 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return response("Mail request is too large.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return response("Invalid mail request.", 400);
  }

  const requestId =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).requestId
      : undefined;
  if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId)) {
    return response("Invalid mail request.", 400);
  }

  const validation = validateAdminMail(body);
  if (!validation.valid) {
    return response("Please check the mail fields.", 400, validation.errors);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Admin mail delivery is unavailable: RESEND_API_KEY is not configured.");
    return response("Email delivery is unavailable.", 503);
  }

  const content = createAdminEmailContent(validation.mail.message);
  try {
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `admin-mail/${requestId}`,
      },
      body: JSON.stringify({
        from: ADMIN_FROM,
        to: [validation.mail.to],
        subject: validation.mail.subject,
        html: content.html,
        text: content.text,
        reply_to: ADMIN_REPLY_TO,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const providerResult: unknown = await providerResponse.json().catch(() => null);
    const accepted =
      providerResponse.ok &&
      typeof providerResult === "object" &&
      providerResult !== null &&
      "id" in providerResult &&
      typeof providerResult.id === "string" &&
      providerResult.id.length > 0;

    if (!accepted) {
      console.error(`Admin mail delivery failed with provider status ${providerResponse.status}.`);
      return response("Email could not be sent. Please try again.", 502);
    }

    return NextResponse.json({ delivered: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Admin mail delivery request failed: ${errorName}.`);
    return response("Email could not be sent. Please try again.", 502);
  }
}

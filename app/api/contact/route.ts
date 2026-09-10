import { type NextRequest, NextResponse } from "next/server";

import {
  CONTACT_LIMITS,
  isContactReason,
  type ContactReason,
  type ContactSubmission,
  validateContactSubmission,
} from "@/lib/contact";

export const runtime = "nodejs";

const GENERAL_EMAIL = "contact@anyhvac.net";
const SUPPORT_EMAIL = "support@anyhvac.net";
const EMAIL_FROM = "AnyHVAC Website <contact@anyhvac.net>";
const MAX_BODY_BYTES = 16_000;
const MIN_FORM_FILL_MS = 2_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type ContactRequest = ContactSubmission & {
  website: string;
  startedAt: number;
};

type RateLimitEntry = { count: number; resetAt: number };

const globalForContact = globalThis as typeof globalThis & {
  contactRateLimits?: Map<string, RateLimitEntry>;
};

const rateLimits =
  globalForContact.contactRateLimits ?? new Map<string, RateLimitEntry>();
globalForContact.contactRateLimits = rateLimits;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ delivered: false, error: message }, { status });
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  if (rateLimits.size > 1000) {
    for (const [key, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(key);
    }
  }
  const current = rateLimits.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function isContactRequest(value: unknown): value is ContactRequest {
  if (typeof value !== "object" || value === null) return false;

  const body = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "reason",
    "name",
    "email",
    "message",
    "website",
    "startedAt",
  ]);

  return (
    Object.keys(body).every((key) => allowedKeys.has(key)) &&
    isContactReason(body.reason) &&
    typeof body.name === "string" &&
    typeof body.email === "string" &&
    typeof body.message === "string" &&
    typeof body.website === "string" &&
    typeof body.startedAt === "number" &&
    Number.isFinite(body.startedAt)
  );
}

function getRecipient(reason: ContactReason) {
  return reason === "Report a Calculation Issue"
    ? SUPPORT_EMAIL
    : GENERAL_EMAIL;
}

function getSubject(reason: ContactReason) {
  if (reason === "Report a Calculation Issue") {
    return "[AnyHVAC Support] Calculation Issue";
  }
  return `[AnyHVAC Contact] ${reason}`;
}

function formatEmailText(submission: ContactSubmission) {
  return [
    `Reason: ${submission.reason}`,
    `Name: ${submission.name || "Not provided"}`,
    `Visitor Email: ${submission.email || "Not provided"}`,
    "",
    "Message:",
    submission.message,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return errorResponse("Expected a JSON request.", 415);
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return errorResponse("Cross-site submissions are not allowed.", 403);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse("Submission is too large.", 413);
  }

  if (isRateLimited(getClientIp(request))) {
    return errorResponse("Too many requests. Please try again later.", 429);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return errorResponse("Submission is too large.", 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return errorResponse("Invalid JSON request.", 400);
  }

  if (!isContactRequest(parsed)) {
    return errorResponse("Invalid contact submission.", 400);
  }

  if (parsed.website.trim()) {
    return errorResponse("Invalid contact submission.", 400);
  }

  const now = Date.now();
  if (
    parsed.startedAt > now ||
    now - parsed.startedAt < MIN_FORM_FILL_MS ||
    now - parsed.startedAt > 24 * 60 * 60 * 1000
  ) {
    return errorResponse("Please refresh the form and try again.", 400);
  }

  const submission: ContactSubmission = {
    reason: parsed.reason,
    name: parsed.name.trim(),
    email: parsed.email.trim().toLowerCase(),
    message: parsed.message.trim(),
  };
  const validationErrors = validateContactSubmission(submission);
  if (Object.keys(validationErrors).length > 0) {
    return NextResponse.json(
      {
        delivered: false,
        error: "Please check the form fields.",
        fields: validationErrors,
      },
      { status: 400 },
    );
  }

  // Keep the limits explicit at the server boundary even if shared validation changes.
  if (
    submission.name.length > CONTACT_LIMITS.name ||
    submission.email.length > CONTACT_LIMITS.email ||
    submission.message.length > CONTACT_LIMITS.message
  ) {
    return errorResponse("Submission is too large.", 413);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Contact delivery is unavailable: RESEND_API_KEY is not configured.");
    return errorResponse("Email delivery is not configured.", 503);
  }

  const emailPayload: Record<string, unknown> = {
    from: EMAIL_FROM,
    to: [getRecipient(submission.reason)],
    subject: getSubject(submission.reason),
    text: formatEmailText(submission),
  };
  if (submission.email) emailPayload.reply_to = submission.email;

  try {
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
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
      console.error(`Contact delivery failed with provider status ${providerResponse.status}.`);
      return errorResponse("Email delivery failed.", 502);
    }

    return NextResponse.json({ delivered: true });
  } catch (error) {
    const message = error instanceof Error ? error.name : "UnknownError";
    console.error(`Contact delivery request failed: ${message}.`);
    return errorResponse("Email delivery failed.", 502);
  }
}

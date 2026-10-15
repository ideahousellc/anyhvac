import { type NextRequest, NextResponse } from "next/server";

import { isSameOrigin, NO_STORE_HEADERS } from "@/lib/admin/request-security";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { MailActionError, SupabaseMailActionRepository } from "@/lib/mail/actions/repository";
import { SUPPORTED_MAILBOXES, type Mailbox } from "@/lib/mail/inbound/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 1_000;

function response(body: object, status: number) { return NextResponse.json(body, { status, headers: NO_STORE_HEADERS }); }

export async function PATCH(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) return response({ updated: false, error: "Authentication required." }, 401);
  if (!isSameOrigin(request)) return response({ updated: false, error: "Request not allowed." }, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return response({ updated: false, error: "Invalid request." }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return response({ updated: false, error: "Invalid request." }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return response({ updated: false, error: "Invalid request." }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return response({ updated: false, error: "Invalid request." }, 400); }
  if (!body || typeof body !== "object") return response({ updated: false, error: "Invalid request." }, 400);
  const value = body as Record<string, unknown>;
  const allowed = new Set(["threadId", "mailbox", "isRead"]);
  if (Object.keys(value).some((key) => !allowed.has(key)) || typeof value.threadId !== "string" || !UUID.test(value.threadId) || typeof value.mailbox !== "string" || !SUPPORTED_MAILBOXES.includes(value.mailbox as Mailbox) || typeof value.isRead !== "boolean") {
    return response({ updated: false, error: "Invalid request." }, 400);
  }
  try {
    const found = await new SupabaseMailActionRepository().setThreadReadState(value.threadId, value.mailbox as Mailbox, value.isRead);
    return found ? response({ updated: true, isRead: value.isRead }, 200) : response({ updated: false, error: "Thread not found." }, 404);
  } catch (error) {
    console.error("Control Room mail state update failed", error instanceof MailActionError ? error.name : "UnknownError");
    return response({ updated: false, error: "Mail state could not be updated." }, 500);
  }
}

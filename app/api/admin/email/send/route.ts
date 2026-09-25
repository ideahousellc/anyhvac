import { type NextRequest, NextResponse } from "next/server";

import { isSameOrigin, NO_STORE_HEADERS } from "@/lib/admin/request-security";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { OutboundDeliveryError, ResendOutboundMailDelivery } from "@/lib/mail/outbound/resend";
import { SupabaseOutboundMailRepository } from "@/lib/mail/outbound/repository";
import { OutboundConsistencyError, ReplyThreadNotFoundError, sendOutboundMail } from "@/lib/mail/outbound/service";
import { validateOutboundRequest } from "@/lib/mail/outbound/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 14_500;

function response(body: object, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) return response({ delivered: false, error: "Authentication required." }, 401);
  if (!isSameOrigin(request)) return response({ delivered: false, error: "Request not allowed." }, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return response({ delivered: false, error: "Invalid email request." }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return response({ delivered: false, error: "Email request is too large." }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return response({ delivered: false, error: "Email request is too large." }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return response({ delivered: false, error: "Invalid email request." }, 400); }
  const validation = validateOutboundRequest(body);
  if (!validation.valid) return response({ delivered: false, error: validation.error }, 400);
  try {
    const stored = await sendOutboundMail(validation.request, new ResendOutboundMailDelivery(), new SupabaseOutboundMailRepository());
    return response({ delivered: true, persisted: true, threadId: stored.threadId }, 200);
  } catch (error) {
    if (error instanceof ReplyThreadNotFoundError) return response({ delivered: false, error: "Thread not found." }, 404);
    if (error instanceof OutboundConsistencyError) {
      console.error("Control Room email was delivered but persistence failed.");
      return response({ delivered: true, persisted: false, error: "Email was sent but could not be saved. Retry to restore it." }, 500);
    }
    if (error instanceof OutboundDeliveryError) {
      console.error(`Control Room email delivery failed: ${error.name}.`);
      return response({ delivered: false, error: error.status === 503 ? "Email delivery is unavailable." : "Email could not be sent. Please try again." }, error.status === 503 ? 503 : 502);
    }
    console.error("Control Room email operation failed: UnknownError.");
    return response({ delivered: false, error: "Email could not be sent. Please try again." }, 500);
  }
}

import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { isSameOrigin } from "@/lib/admin/request-security";
import { body, response, UUID } from "@/lib/agents/http";
import { ReviewError } from "@/lib/weekly/domain";
import { enabled, mutate, readState } from "@/lib/weekly/storage";
import type { ReviewAction } from "@/lib/weekly/types";
import { InboxError } from "@/lib/agents/state";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function guard(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) return response({ error: "Owner authentication required." }, 401);
  if (!enabled()) return response({ error: "Weekly review is disabled." }, 503);
}
function fail(error: unknown) { return response({ error: error instanceof ReviewError || error instanceof InboxError ? error.message : "Private review unavailable. Existing records remain preserved." }, error instanceof ReviewError || error instanceof InboxError ? error.status : 503); }
export async function GET(request: NextRequest) { const denied = guard(request); if (denied) return denied; try { return response({ state: await readState(), executionEnabled: false }); } catch (error) { return fail(error); } }
export async function POST(request: NextRequest) {
  const denied = guard(request); if (denied) return denied;
  if (!isSameOrigin(request)) return response({ error: "Request not allowed." }, 403);
  try {
    const value = await body(request, ["requestId", "action", "version", "digest", "target", "text", "caption"], 24000);
    if (typeof value.requestId !== "string" || !UUID.test(value.requestId) || !["revision", "edit", "review", "approve"].includes(String(value.action)) || !Number.isSafeInteger(value.version) || typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) || ["target", "text", "caption"].some(k => value[k] !== undefined && typeof value[k] !== "string")) return response({ error: "Invalid review action." }, 400);
    const action = { ...value, at: new Date().toISOString() } as ReviewAction;
    return response({ state: await mutate(action), executionEnabled: false });
  } catch (error) { return fail(error); }
}

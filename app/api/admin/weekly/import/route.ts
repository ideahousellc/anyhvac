import { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { isSameOrigin } from "@/lib/admin/request-security";
import { body, response } from "@/lib/agents/http";
import { InboxError } from "@/lib/agents/state";
import { enabled } from "@/lib/weekly/storage";
import { ReviewError } from "@/lib/weekly/domain";
import { importHistoricalFixture } from "@/lib/weekly/ingest";
import type { ReviewContent } from "@/lib/weekly/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) return response({ error: "Owner authentication required." }, 401);
  if (!enabled() || process.env.WEEKLY_CONTENT_STORAGE !== "supabase" || process.env.WEEKLY_CONTENT_IMPORT_ENABLED !== "true") return response({ error: "Private fixture import disabled." }, 503);
  if (!isSameOrigin(request)) return response({ error: "Request not allowed." }, 403);
  try { const value = await body(request, ["content"], 2000000); return response({ state: await importHistoricalFixture(value.content as ReviewContent), executionEnabled: false }); }
  catch (error) { return response({ error: error instanceof ReviewError || error instanceof InboxError ? error.message : "Private import unconfirmed. Check existing history before retrying." }, error instanceof ReviewError || error instanceof InboxError ? error.status : 503); }
}

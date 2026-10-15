import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { isSameOrigin } from "@/lib/admin/request-security";
import { body, response } from "@/lib/agents/http";
import { InboxError } from "@/lib/agents/state";
import { enabled, ownerId } from "@/lib/weekly/storage";
import { HostedReviewStore } from "@/lib/weekly/hosted";
import { APPROVED_BATCH_ID, APPROVED_CONTENT_DIGEST } from "@/lib/weekly/approved-batch";
import { approvedSource, approvedImportMedia } from "@/lib/weekly/approved-source";
import { commitApprovedStagedBatch, validateApprovedState } from "@/lib/weekly/approved-ingest";
import { ReviewError } from "@/lib/weekly/domain";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
function guard(request: NextRequest) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) return response({ error: "Owner authentication required." }, 401);
  if (!enabled() || process.env.WEEKLY_CONTENT_STORAGE !== "supabase" || process.env.WEEKLY_CONTENT_APPROVED_IMPORT_ENABLED !== "true") return response({ error: "Approved private import disabled." }, 503);
}
function store() { return new HostedReviewStore(ownerId(), APPROVED_BATCH_ID); }
function fail(error: unknown) { return response({ error: error instanceof ReviewError || error instanceof InboxError ? error.message : "Import unconfirmed. Reconcile existing history before retrying." }, error instanceof ReviewError || error instanceof InboxError ? error.status : 503); }
export async function GET(request: NextRequest) {
  const denied = guard(request); if (denied) return denied;
  try {
    const target = store(), alreadyImported = await target.exists();
    if (alreadyImported) validateApprovedState((await target.read()).state);
    const media = approvedImportMedia();
    if (media.some(m => m.bytes > 2000000)) throw new ReviewError("Approved asset exceeds reviewed upload size.", 503);
    return response({ batchId: APPROVED_BATCH_ID, digest: APPROVED_CONTENT_DIGEST, revision: 5, media, alreadyImported, executionEnabled: false });
  } catch (error) { return fail(error); }
}
export async function POST(request: NextRequest) {
  const denied = guard(request); if (denied) return denied;
  if (!isSameOrigin(request)) return response({ error: "Request not allowed." }, 403);
  try {
    if ([...request.nextUrl.searchParams.keys()].some(key => key !== "media") || request.nextUrl.searchParams.getAll("media").length > 1) throw new ReviewError("Invalid import query.", 400);
    const target = store();
    if (await target.exists()) throw new ReviewError("Already imported. Existing approval/history preserved; check status.");
    const media = approvedImportMedia(), id = request.nextUrl.searchParams.get("media");
    if (id !== null) {
      const expected = media.find(m => m.id === id);
      if (!expected || expected.bytes > 2000000) throw new ReviewError("Unknown approved asset.", 422);
      if (request.headers.get("content-type") !== expected.type) throw new ReviewError("Approved media type required.", 415);
      const length = request.headers.get("content-length");
      if (length !== null && (!Number.isSafeInteger(Number(length)) || Number(length) !== expected.bytes)) throw new ReviewError("Approved byte length required.", 413);
      const reader = request.body?.getReader(); if (!reader) throw new ReviewError("Media bytes required.", 400);
      const chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > expected.bytes) { await reader.cancel(); throw new ReviewError("Media exceeds approved size.", 413); } chunks.push(item.value); } } finally { reader.releaseLock(); }
      const bytes = Buffer.concat(chunks);
      if (size !== expected.bytes || createHash("sha256").update(bytes).digest("hex") !== expected.id) throw new ReviewError("Approved media hash mismatch.", 422);
      await target.upload(expected, bytes);
      return response({ uploaded: expected.id, executionEnabled: false });
    }
    const value = await body(request, ["action"], 256);
    if (value.action !== "finish") throw new ReviewError("Explicit private import confirmation required.", 400);
    const source = approvedSource(), currentIds = new Set(source.versions[4].content.media.map(m => m.id));
    for (const expected of media.filter(m => !currentIds.has(m.id))) {
      const bytes = await target.media(expected);
      if (bytes.length !== expected.bytes || createHash("sha256").update(bytes).digest("hex") !== expected.id) throw new ReviewError("Staged media missing or changed.", 422);
    }
    return response(await commitApprovedStagedBatch(source, target));
  } catch (error) { return fail(error); }
}

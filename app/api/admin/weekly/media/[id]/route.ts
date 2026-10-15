import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { NO_STORE_HEADERS } from "@/lib/admin/request-security";
import { response } from "@/lib/agents/http";
import { enabled, mediaBytes, readState } from "@/lib/weekly/storage";
import { selectedBatch } from "@/lib/weekly/selection";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) return response({ error: "Owner authentication required." }, 401);
  if (!enabled()) return response({ error: "Weekly review disabled." }, 503);
  const { id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(id)) return response({ error: "Media not found." }, 404);
  try {
    const batch = selectedBatch(request.nextUrl.searchParams.get("batch"));
    const state = await readState(batch); const media = state.versions.flatMap(v => v.content.media).find(m => m.id === id);
    if (!media) return response({ error: "Media not found." }, 404);
    const bytes = await mediaBytes(media, batch);
    const headers = { ...NO_STORE_HEADERS, "Content-Type": media.type, "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow", "Accept-Ranges": "bytes" };
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
      const start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
      const end = match[1] ? Math.min(match[2] ? Number(match[2]) : bytes.length - 1, bytes.length - 1) : bytes.length - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length || Number(match[2]) === 0 && !match[1]) return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${bytes.length}` } });
      return new NextResponse(new Uint8Array(bytes.subarray(start, end + 1)), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": String(end - start + 1) } });
    }
    return new NextResponse(new Uint8Array(bytes), { headers: { ...headers, "Content-Length": String(bytes.length) } });
  } catch { return response({ error: "Private media unavailable or changed." }, 503); }
}

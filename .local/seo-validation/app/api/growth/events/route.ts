import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/session";
import { parseGrowthEvent } from "@/lib/growth/events";
import { recordGrowthEvent } from "@/lib/growth/repository";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 512;
// A global per-instance cap bounds abuse without storing IPs or visitor keys.
let windowStartedAt = 0;
let requestCount = 0;

function reply(status: number) {
  return new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "production" || process.env.GROWTH_MEASUREMENT_ENABLED !== "true") return reply(503);
  const url = new URL(request.url);
  if (url.protocol !== "https:" || !["www.anyhvac.net", "anyhvac.net"].includes(url.host) || request.headers.get("origin") !== url.origin) return reply(403);
  if (request.headers.get("sec-fetch-site") !== "same-origin") return reply(403);
  // Exclude any admin-session cookie, even expired, without altering authentication.
  if (request.cookies.has(ADMIN_SESSION_COOKIE)) return reply(204);
  const now = Date.now();
  if (now - windowStartedAt >= 60_000) { windowStartedAt = now; requestCount = 0; }
  if (++requestCount > 120) return reply(429);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply(415);
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) return reply(413);
  // Stream with a hard cap rather than buffering an arbitrary client body.
  const reader = request.body?.getReader();
  if (!reader) return reply(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); return reply(413); }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    let decoded: unknown;
    try { decoded = JSON.parse(body); } catch { return reply(400); }
    const event = parseGrowthEvent(decoded, now);
    if (!event) return reply(400);
    await recordGrowthEvent(event);
    return reply(204);
  } catch { return reply(503); }
}

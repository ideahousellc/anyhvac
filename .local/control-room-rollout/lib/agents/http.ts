import { type NextRequest, NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "@/lib/admin/request-security";
import { InboxError } from "./state";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function response(body: object, status = 200) { return NextResponse.json(body, { status, headers: { ...NO_STORE_HEADERS, "X-Robots-Tag": "noindex, nofollow" } }); }
export async function body(request: NextRequest, allowed: string[], limit = 12_000): Promise<Record<string, unknown>> {
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) throw new InboxError("JSON required.", 415);
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw new InboxError("Request too large.", 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > limit) throw new InboxError("Request too large.", 413);
  let value;
  try { value = JSON.parse(raw); } catch { throw new InboxError("Invalid JSON.", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(k => !allowed.includes(k))) throw new InboxError("Invalid request fields.", 400);
  return value;
}
export function failure(error: unknown) { return response({ error: error instanceof InboxError ? error.message : "Agent inbox is unavailable. Your saved messages remain preserved." }, error instanceof InboxError ? error.status : 503); }

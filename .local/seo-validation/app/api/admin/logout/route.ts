import { type NextRequest, NextResponse } from "next/server";

import { isSameOrigin, NO_STORE_HEADERS } from "@/lib/admin/request-security";
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { loggedOut: false, error: "Request not allowed." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const result = NextResponse.json({ loggedOut: true }, { headers: NO_STORE_HEADERS });
  result.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions,
    maxAge: 0,
  });
  return result;
}

import { NextResponse, type NextRequest } from "next/server";

import { sessionSecret, SESSION_COOKIE, verifySession } from "@/lib/auth/session";

// Semakan awal sahaja (tandatangan + tempoh token). Setiap Route Handler dan halaman pentadbir
// mengesahkan sesi sepenuhnya (pengguna, peranan, status) melalui src/lib/auth/guard.ts.
const PUBLIC = new Set(["/admin/log-masuk", "/api/admin/session"]);

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();
  const secret = sessionSecret();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = secret ? verifySession(token, secret, Math.floor(Date.now() / 1000)) : null;
  if (valid) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sila log masuk." } },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/log-masuk";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

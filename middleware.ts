import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "monican_ref";
const COOKIE_CREF = "monican_cref";
const MAX_AGE = 60 * 60 * 24 * 30; /* 30 j */

function setRefCookie(res: NextResponse, name: string, raw: string | null) {
  if (!raw) return;
  const clean = raw
    .trim()
    .replace(/[^A-Za-z0-9\-_]/g, "")
    .slice(0, 32);
  if (clean.length < 4) return;
  res.cookies.set(name, clean, {
    maxAge: MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  setRefCookie(res, COOKIE, request.nextUrl.searchParams.get("ref"));
  setRefCookie(res, COOKIE_CREF, request.nextUrl.searchParams.get("cref"));
  if (process.env.NODE_ENV !== "production") {
    // Evite HTML/chunks obsolètes en local (404 main-app/layout.css après hot reload).
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.headers.set("Pragma", "no-cache");
    res.headers.set("Expires", "0");
    res.headers.set("Surrogate-Control", "no-store");
  }
  return res;
}

/**
 * Dwe eksli TOUT /_next/* (static, image, webpack-hmr, data, elatriye) — sinon middleware ka
 * kole ak chunk yo epi navigatè wè 404 sou main-app.js / layout.css.
 */
export const config = {
  matcher: ["/((?!api|_next/|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

import { NextResponse } from "next/server";
import { KESYE_SESSION_COOKIE_NAME } from "@/lib/kesye/session-cookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(KESYE_SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}

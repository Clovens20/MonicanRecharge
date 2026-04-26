import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import { hashKesyeNip, isValidFourDigitNip } from "@/lib/kesye/nip";
import { signKesyeSession, KESYE_SESSION_COOKIE_NAME } from "@/lib/kesye/session-cookie";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "0";
  const rl = checkRateLimit(`kesye-login:${ip}`, 40, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Twòp tantativ" }, { status: 429 });
  }

  let body: { nip?: string; identifiant?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const nip = body.nip || "";
  const ident = (body.identifiant || "").trim().toLowerCase();
  if (!isValidFourDigitNip(nip)) return NextResponse.json({ error: "NIP 4 chif" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });
  const hash = hashKesyeNip(nip);
  let query = svc
    .from("kesye")
    .select("id, non_boutik, non_complet, email, tel, nip_temp")
    .eq("nip_hash", hash)
    .eq("aktif", true);
  if (ident) {
    const digits = ident.replace(/\D/g, "");
    query = query.or(`email.eq.${ident},tel.eq.${digits}`);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data?.id) return NextResponse.json({ error: "NIP pa bon" }, { status: 401 });

  const temp = Boolean(data.nip_temp);
  const token = signKesyeSession(data.id as string, temp ? "temp" : "full");
  const res = NextResponse.json({
    ok: true,
    non: data.non_boutik,
    nonComplet: data.non_complet || "",
    email: data.email || "",
    tel: data.tel || "",
    requireNipChange: temp,
  });
  res.cookies.set(KESYE_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: temp ? 20 * 60 : 12 * 3600,
  });
  return res;
}

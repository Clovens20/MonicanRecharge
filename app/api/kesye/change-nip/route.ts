import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import { hashKesyeNip, isValidFourDigitNip } from "@/lib/kesye/nip";
import { KESYE_SESSION_COOKIE_NAME, signKesyeSession, verifyKesyeSessionInfo } from "@/lib/kesye/session-cookie";

export async function POST(req: Request) {
  const raw = cookies().get(KESYE_SESSION_COOKIE_NAME)?.value;
  const sess = verifyKesyeSessionInfo(raw);
  if (!sess?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (sess.mode !== "temp") return NextResponse.json({ error: "Pa bezwen chanje NIP" }, { status: 400 });

  let body: { newNip?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const newNip = body.newNip || "";
  if (!isValidFourDigitNip(newNip)) return NextResponse.json({ error: "NIP 4 chif obligatwa" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });
  const { error } = await svc
    .from("kesye")
    .update({
      nip_hash: hashKesyeNip(newNip),
      nip_temp: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sess.id);

  if (error) {
    if (String(error.code) === "23505") {
      return NextResponse.json({ error: "NIP deja itilize — chwazi yon lòt" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(KESYE_SESSION_COOKIE_NAME, signKesyeSession(sess.id, "full"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });
  return res;
}

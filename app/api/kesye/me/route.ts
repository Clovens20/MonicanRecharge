import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import { verifyKesyeSessionInfo, KESYE_SESSION_COOKIE_NAME } from "@/lib/kesye/session-cookie";

export async function GET() {
  const raw = cookies().get(KESYE_SESSION_COOKIE_NAME)?.value;
  const sess = verifyKesyeSessionInfo(raw);
  if (!sess?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ ok: false }, { status: 503 });
  const { data, error } = await svc
    .from("kesye")
    .select("id, non_boutik, non_complet, email, tel, aktif")
    .eq("id", sess.id)
    .eq("aktif", true)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({
    ok: true,
    id: data.id,
    non: data.non_boutik,
    nonComplet: data.non_complet || "",
    email: data.email || "",
    tel: data.tel || "",
    mustChangeNip: sess.mode === "temp",
  });
}

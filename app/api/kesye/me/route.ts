import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase } from "@/lib/supabase/service";
import { verifyKesyeSessionInfo, KESYE_SESSION_COOKIE_NAME } from "@/lib/kesye/session-cookie";

/**
 * Session kèsye (boutik) — toujours **200** : pa gen 401 sou paj piblik
 * (evite bouk retry / kesyeOk ki rete false ak `r.ok` sou repons JSON).
 */
export async function GET() {
  try {
    const raw = cookies().get(KESYE_SESSION_COOKIE_NAME)?.value;
    const sess = verifyKesyeSessionInfo(raw);
    if (!sess?.id) {
      return NextResponse.json({ ok: false, kesye: null, authenticated: false }, { status: 200 });
    }

    const svc = getServiceSupabase();
    if (!svc) {
      return NextResponse.json({ ok: false, kesye: null, error: "service_unavailable" }, { status: 200 });
    }

    const { data, error } = await svc
      .from("kesye")
      .select("id, non_boutik, non_complet, email, tel, aktif")
      .eq("id", sess.id)
      .eq("aktif", true)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, kesye: null, authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      id: data.id,
      non: data.non_boutik,
      nonComplet: data.non_complet || "",
      email: data.email || "",
      tel: data.tel || "",
      mustChangeNip: sess.mode === "temp",
    });
  } catch {
    return NextResponse.json({ ok: false, kesye: null, error: "server_error" }, { status: 200 });
  }
}

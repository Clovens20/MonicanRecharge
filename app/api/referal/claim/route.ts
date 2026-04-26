import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

/** Atribiye referrer depi cookie `monican_cref` (kòd kliyan). */
export async function POST() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kod = cookies().get("monican_cref")?.value?.trim().replace(/[^A-Za-z0-9]/g, "") || "";
  if (kod.length < 4) return NextResponse.json({ ok: true, skipped: true });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { data: refUser } = await svc.from("referal_kod").select("user_id").eq("kod", kod).maybeSingle();
  const referrerId = refUser?.user_id as string | undefined;
  if (!referrerId || referrerId === user.id) return NextResponse.json({ ok: true, skipped: true });

  const { data: ex } = await sb.from("referal_atribisyon").select("referee_user_id").eq("referee_user_id", user.id).maybeSingle();
  if (ex) return NextResponse.json({ ok: true, already: true });

  const { error } = await sb.from("referal_atribisyon").insert({
    referee_user_id: user.id,
    referrer_user_id: referrerId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

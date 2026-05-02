import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Recharges `tranzaksyon` kote `user_id` = ajan konekte a (voye depi tablo ajan, elatriye). */
export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ag } = await sb.from("ajan").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!ag) return NextResponse.json({ error: "Pa ajan" }, { status: 403 });

  const { data: rows, error } = await sb
    .from("tranzaksyon")
    .select(
      "id,created_at,estati,operatè,nimewo_resevwa,pays_kòd,montant_usd,pri_koutaj,benefis,frais_platfòm_usd,mòd_peman,reloadly_transaction_id,ref_kòd",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recharges: rows || [] });
}

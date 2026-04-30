import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

export async function GET(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email || !isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = new URL(req.url).searchParams.get("userId")?.trim();
  if (!userId) return NextResponse.json({ error: "userId" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { data: agent, error: e1 } = await svc.from("ajan").select("*").eq("user_id", userId).maybeSingle();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  if (!agent) return NextResponse.json({ error: "Ajan pa jwenn" }, { status: 404 });

  const { data: txRows, error: e2 } = await svc
    .from("tranzaksyon")
    .select("id,created_at,estati,montant_usd,pri_koutaj,mòd_peman,ref_kòd,ajan_id,komisyon_ajan,nimewo_resevwa,operatè")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const { data: komRows, error: e3 } = await svc
    .from("komisyon_tranzaksyon")
    .select("id,created_at,tranzaksyon_ref,montant_vann_usd,montant_komisyon,pousantaj,estati,nòt_admin")
    .eq("ajan_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  return NextResponse.json({
    agent,
    tranzaksyon: txRows || [],
    komisyon: komRows || [],
  });
}

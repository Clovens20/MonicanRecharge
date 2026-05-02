import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isKomisyonAdminCredit(ref: unknown): boolean {
  return String(ref || "").startsWith("ADMIN-");
}

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase pa konfigire" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: agent, error: e1 } = await sb.from("ajan").select("*").eq("user_id", user.id).maybeSingle();
  if (e1 || !agent) return NextResponse.json({ error: "Pa ajan" }, { status: 403 });

  const { data: lines, error: e2 } = await sb
    .from("komisyon_tranzaksyon")
    .select("montant_vann_usd, montant_komisyon, created_at, tranzaksyon_ref")
    .eq("ajan_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const rows = lines || [];
  const todayKom = rows.filter((r) => r.created_at >= startDay);
  const monthKom = rows.filter((r) => r.created_at >= startMonth);

  const todayKomSales = todayKom.filter((r) => !isKomisyonAdminCredit(r.tranzaksyon_ref));
  const monthKomSales = monthKom.filter((r) => !isKomisyonAdminCredit(r.tranzaksyon_ref));

  const { data: selfTxs, error: eTx } = await sb
    .from("tranzaksyon")
    .select("montant_usd, created_at")
    .eq("user_id", user.id)
    .eq("estati", "siksè")
    .gte("created_at", startMonth)
    .order("created_at", { ascending: false })
    .limit(500);

  if (eTx) return NextResponse.json({ error: eTx.message }, { status: 500 });

  const selfRows = selfTxs || [];
  const todaySelf = selfRows.filter((r) => r.created_at >= startDay);
  const monthSelf = selfRows.filter((r) => r.created_at >= startMonth);

  const txToday = todayKomSales.length + todaySelf.length;
  const revToday =
    todayKomSales.reduce((s, r) => s + Number(r.montant_vann_usd || 0), 0) +
    todaySelf.reduce((s, r) => s + Number(r.montant_usd || 0), 0);
  const txMonth = monthKomSales.length + monthSelf.length;

  return NextResponse.json({
    agent,
    stats: {
      txToday,
      revToday,
      txMonth,
      komTotalGanye: Number(agent.total_komisyon_ganye || 0),
      balansAnnatant: Number(agent.balans_komisyon || 0),
    },
    recent: rows.slice(0, 30),
  });
}

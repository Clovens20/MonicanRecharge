import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("montant_vann_usd, montant_komisyon, created_at")
    .eq("ajan_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const rows = lines || [];
  const today = rows.filter((r) => r.created_at >= startDay);
  const month = rows.filter((r) => r.created_at >= startMonth);

  const txToday = today.length;
  const revToday = today.reduce((s, r) => s + Number(r.montant_vann_usd || 0), 0);
  const txMonth = month.length;
  const komTotal = rows.reduce((s, r) => s + Number(r.montant_komisyon || 0), 0);

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

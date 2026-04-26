import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { plReport } from "@/lib/admin/mongo-stats";

export async function GET(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") as "day" | "week" | "month") || "week";
  const base = await plReport(range);

  let komisyon = 0;
  const svc = getServiceSupabase();
  if (svc) {
    const since =
      range === "day"
        ? new Date(Date.now() - 86400000).toISOString()
        : range === "week"
          ? new Date(Date.now() - 7 * 86400000).toISOString()
          : new Date(Date.now() - 30 * 86400000).toISOString();
    const { data } = await svc.from("komisyon_tranzaksyon").select("montant_komisyon").gte("created_at", since);
    komisyon = (data || []).reduce((s, r) => s + Number((r as { montant_komisyon?: number }).montant_komisyon || 0), 0);
  }

  return NextResponse.json({
    ...base,
    commissionAgents: komisyon,
    netAfterCommissions: base.net - komisyon,
  });
}

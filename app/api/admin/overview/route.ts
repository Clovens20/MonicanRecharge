import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { todayStats, activeCustomersApprox } from "@/lib/admin/mongo-stats";
import { getReloadlyMinAlertUsd } from "@/lib/admin/reloadly-settings";
import { getReloadlyBalanceUsdForAdmin } from "@/lib/reloadly/adminBalance";
import { sumActiveAgentBalansKomisyonUsd } from "@/lib/admin/agent-balance-sum";
import { sumGrossMarginUsdSince } from "@/lib/admin/tranzaksyon-margin-sum";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const t = await todayStats();
  const customers = await activeCustomersApprox();
  const { balanceUsd: reloadly, source: reloadlyBalanceSource } = await getReloadlyBalanceUsdForAdmin();
  const minAlert = await getReloadlyMinAlertUsd();
  const reloadlyLow = reloadly < minAlert;

  let agents = 0;
  let moncashPending = 0;
  let pendingAjanApps = 0;
  let totalAgentBalansKomisyonUsd = 0;
  let markupProfitToday = 0;
  let markupProfit7d = 0;
  let markupProfit30d = 0;
  const svc = getServiceSupabase();
  if (svc) {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const start7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [pt, p7, p30] = await Promise.all([
      sumGrossMarginUsdSince(svc, startDay),
      sumGrossMarginUsdSince(svc, start7),
      sumGrossMarginUsdSince(svc, start30),
    ]);
    markupProfitToday = pt;
    markupProfit7d = p7;
    markupProfit30d = p30;
    totalAgentBalansKomisyonUsd = await sumActiveAgentBalansKomisyonUsd(svc);
    const { count: ac } = await svc.from("ajan").select("*", { count: "exact", head: true }).eq("estati", "aktif");
    agents = ac || 0;
    const { count: mc } = await svc
      .from("peman_moncash")
      .select("*", { count: "exact", head: true })
      .eq("estati", "annatant");
    moncashPending = mc || 0;
    const { count: ap, error: apErr } = await svc
      .from("aplasyon_ajan")
      .select("*", { count: "exact", head: true })
      .eq("estati", "annatant");
    if (!apErr) pendingAjanApps = ap || 0;
  }

  return NextResponse.json({
    todayRev: t.rev,
    todayTx: t.count,
    markupProfitToday,
    markupProfit7d,
    markupProfit30d,
    reloadly,
    reloadlyBalanceSource,
    reloadlyLow,
    reloadlyMinAlert: minAlert,
    customers,
    agents,
    moncashPending,
    pendingAjanApps,
    totalAgentBalansKomisyonUsd,
  });
}

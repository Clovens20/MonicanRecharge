import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { plReport } from "@/lib/admin/mongo-stats";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { range?: "day" | "week" | "month" };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const range = body.range || "week";
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

  const netAfter = base.net - komisyon;
  await sendAdminEmail(
    `Rapò finansye (${range})`,
    `<table style="border-collapse:collapse">
      <tr><td>Revni brit</td><td><strong>$${base.gross.toFixed(2)}</strong></td></tr>
      <tr><td>Kò Reloadly</td><td>$${base.costs.toFixed(2)}</td></tr>
      <tr><td>Pwofi net</td><td>$${base.net.toFixed(2)}</td></tr>
      <tr><td>Komisyon ajan</td><td>$${komisyon.toFixed(2)}</td></tr>
      <tr><td>Net apre komisyon</td><td><strong>$${netAfter.toFixed(2)}</strong></td></tr>
    </table>`
  );

  return NextResponse.json({ ok: true });
}

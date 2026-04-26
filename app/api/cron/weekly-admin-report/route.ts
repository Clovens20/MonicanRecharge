import { NextResponse } from "next/server";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";
import { plReport } from "@/lib/admin/mongo-stats";
import { getServiceSupabase } from "@/lib/supabase/service";

/** Rapò semèn — Lendi (Vercel cron). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rep = await plReport("week");
  let kom = 0;
  const svc = getServiceSupabase();
  if (svc) {
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await svc.from("komisyon_tranzaksyon").select("montant_komisyon").gte("created_at", since);
    kom = (data || []).reduce((s, r) => s + Number((r as { montant_komisyon?: number }).montant_komisyon || 0), 0);
  }

  await sendAdminEmail(
    "Monican Recharge — Rapò semèn",
    `<p><strong>Revni brit</strong>: $${rep.gross.toFixed(2)}</p>
     <p><strong>Kò Reloadly</strong>: $${rep.costs.toFixed(2)}</p>
     <p><strong>Pwofi net (avèk komisyon)</strong>: $${(rep.net - kom).toFixed(2)}</p>
     <p><strong>Komisyon ajan (7j)</strong>: $${kom.toFixed(2)}</p>`
  );

  return NextResponse.json({ ok: true });
}

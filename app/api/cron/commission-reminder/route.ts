import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";

/**
 * Chak Lendi — apèl depi Vercel Cron oswa lòt scheduler.
 * Header: Authorization: Bearer CRON_SECRET
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = getServiceSupabase();
  if (!svc) {
    return NextResponse.json({ error: "Supabase service pa konfigire" }, { status: 503 });
  }

  const { data: agents, error } = await svc
    .from("ajan")
    .select("user_id,kòd_ajan,balans_komisyon,estati")
    .eq("estati", "aktif")
    .gt("balans_komisyon", 5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://recharge.monican.shop";

  let sent = 0;
  for (const a of agents || []) {
    const { data: u } = await svc.auth.admin.getUserById(a.user_id);
    const email = u.user?.email;
    if (!email || !key) continue;
    const bal = Number(a.balans_komisyon || 0).toFixed(2);
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Monican Recharge <${from}>`,
          to: [email],
          subject: `💰 Komisyon ou disponib: $${bal}`,
          html: `<p>💰 Komisyon ou disponib: <strong>$${bal}</strong></p>
            <p>Mande peman nan: <a href="${base}/tableau-de-bord/ajan">${base}/tableau-de-bord/ajan</a></p>`,
        }),
      });
      sent++;
    } catch (e) {
      console.warn("cron mail fail", a.kòd_ajan, e);
    }
  }

  return NextResponse.json({ ok: true, agents: (agents || []).length, emailsSent: sent });
}

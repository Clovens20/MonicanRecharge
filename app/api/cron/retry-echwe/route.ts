import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { attemptReloadlyRetry, type FailedTxDoc } from "@/lib/recharge/retry-send";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";
import { sendWhatsAppIfConfigured } from "@/lib/notify/twilio-whatsapp";

/**
 * Cron chak 5 min — relanse tranzaksyon Reloadly ki echwe (Mongo: status echwe + retry_payload).
 * Edge Function équivalent: "retry-echwe".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  if (!db) return NextResponse.json({ ok: true, retried: 0, note: "no mongo" });

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const candidates = (await db
    .collection("tranzaksyon")
    .find({
      status: "echwe",
      created_at: { $gte: since },
      retry_count: { $lt: 3 },
      retry_payload: { $exists: true },
    })
    .limit(20)
    .toArray()) as FailedTxDoc[];

  let retried = 0;
  const failures: string[] = [];

  for (const doc of candidates) {
    const r = await attemptReloadlyRetry(doc);
    if (r.ok) retried += 1;
    else if (r.error && r.error !== "missing retry_payload") failures.push(`${doc.id}: ${r.error}`);
  }

  if (failures.length > 0) {
    await sendAdminEmail("Retry tranzaksyon — erè", `<pre>${failures.join("\n")}</pre>`);
    await sendWhatsAppIfConfigured({
      to: process.env.TWILIO_ADMIN_RELOADLY_ALERT_TO,
      body: `Retry echwe: ${failures.slice(0, 3).join("; ")}`,
    });
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, retried });
}

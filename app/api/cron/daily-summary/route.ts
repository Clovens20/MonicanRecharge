import { NextResponse } from "next/server";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";
import { todayStats } from "@/lib/admin/mongo-stats";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const t = await todayStats();
  await sendAdminEmail(
    "Monican Recharge — Rezime jounen an",
    `<p>Revni jodi a: <strong>$${t.rev.toFixed(2)}</strong></p><p>Tranzaksyon: <strong>${t.count}</strong></p>`
  );

  return NextResponse.json({ ok: true });
}

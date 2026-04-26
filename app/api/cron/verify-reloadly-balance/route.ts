import { NextResponse } from "next/server";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";
import { sendWhatsAppIfConfigured } from "@/lib/notify/twilio-whatsapp";
import { getReloadlyMinAlertUsd } from "@/lib/admin/reloadly-settings";

/** Verifye balans Reloadly — cron chak èdtan (Vercel / scheduler). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Replace with real Reloadly balance API when credentials available.
  const balance = parseFloat(process.env.RELOADLY_BALANCE_USD || "0");
  const min = await getReloadlyMinAlertUsd();
  const low = balance < min;

  if (low) {
    await sendAdminEmail(
      "⚠️ ALÈT: Balans Reloadly ba",
      `<p>Balans Reloadly = <strong>$${balance.toFixed(2)}</strong> (seuil $${min})</p><p>Tanpri recharje kounye a.</p>`
    );
    await sendWhatsAppIfConfigured({
      to: process.env.TWILIO_ADMIN_RELOADLY_ALERT_TO,
      body: `⚠️ ALÈT: Balans Reloadly = $${balance.toFixed(2)}. Tanpri recharje kounye a!`,
    });
  }

  return NextResponse.json({ ok: true, balance, low });
}

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { buildRechargeFromBody, type RechargeBody } from "@/lib/recharge/executeSend";
import { getGlobalMarkupConfig } from "@/lib/admin/markup-settings";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";
import { sendWhatsAppIfConfigured } from "@/lib/notify/twilio-whatsapp";

function orderId() {
  return `MC-${randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function POST(req: Request) {
  let body: RechargeBody & { refKod?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }

  if (body.paymentMethod !== "moncash") {
    return NextResponse.json({ error: "Selman Moncash" }, { status: 400 });
  }

  const cookieRef = cookies().get("monican_ref")?.value;
  const raw = ((body.refKod || cookieRef || "") as string).trim();
  const ref = raw || null;
  const { refKod: _r, ...recharge } = body;

  const markup = await getGlobalMarkupConfig();
  const built = buildRechargeFromBody(recharge as RechargeBody, ref, markup);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Supabase service pa konfigire" }, { status: 503 });

  const sb = createClient();
  let userId: string | null = null;
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    userId = user?.id || null;
  }

  const publicId = orderId();
  const moncashNum = process.env.NEXT_PUBLIC_MONCASH_MERCHANT_PHONE || process.env.MONCASH_MERCHANT_PHONE || "+509XXXX";

  const { error } = await svc.from("peman_moncash").insert({
    order_public_id: publicId,
    user_id: userId,
    payload: { recharge: recharge as RechargeBody, refKod: ref },
    amount_usd: built.record.amount_usd,
    htg_display: built.record.amount_local,
    moncash_numero: moncashNum,
    estati: "annatant",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  await sendAdminEmail(
    "💚 Nouvo peman Moncash annatant",
    `<p>$${built.record.amount_usd} — verifye: <a href="${base}/admin/moncash">${base}/admin/moncash</a></p><p>Order: <code>${publicId}</code></p>`
  );
  await sendWhatsAppIfConfigured({
    to: process.env.TWILIO_ADMIN_MONCASH_ALERT_TO,
    body: `💚 Nouvo peman Moncash annatant!\n$${built.record.amount_usd} | Recharge pou: ${built.record.recipient}\nVerifye: ${base}/admin/moncash\nOrder: ${publicId}`,
  });

  return NextResponse.json({ orderPublicId: publicId });
}

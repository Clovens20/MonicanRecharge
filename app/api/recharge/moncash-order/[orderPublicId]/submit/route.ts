import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";
import { sendWhatsAppIfConfigured } from "@/lib/notify/twilio-whatsapp";

const MAX_B64 = 900_000;

export async function POST(req: Request, ctx: { params: { orderPublicId: string } }) {
  const { orderPublicId } = ctx.params;
  let body: { screenshotBase64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const shot = (body.screenshotBase64 || "").trim();
  if (!shot.startsWith("data:image/") || shot.length < 100 || shot.length > MAX_B64) {
    return NextResponse.json({ error: "Screenshot envalid" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { data: row, error: e1 } = await svc.from("peman_moncash").select("*").eq("order_public_id", orderPublicId).maybeSingle();
  if (e1 || !row || row.estati !== "annatant") {
    return NextResponse.json({ error: "Pa disponib" }, { status: 400 });
  }

  const { error: e2 } = await svc
    .from("peman_moncash")
    .update({ screenshot_url: shot })
    .eq("order_public_id", orderPublicId);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  await sendAdminEmail(
    "Moncash — screenshot resevwa",
    `<p>Itilizatè voye screenshot pou <code>${orderPublicId}</code>.</p><p><a href="${base}/admin/moncash">Verifye admin</a></p>`
  );
  await sendWhatsAppIfConfigured({
    to: process.env.TWILIO_ADMIN_MONCASH_ALERT_TO,
    body: `📷 Screenshot Moncash: ${orderPublicId}\nVerifye: ${base}/admin/moncash`,
  });

  return NextResponse.json({ ok: true });
}

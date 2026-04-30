import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildRechargeFromBody, type RechargeBody, type RechargeRecord } from "@/lib/recharge/executeSend";
import { sendCashRechargeViaReloadly } from "@/lib/recharge/cashViaReloadly";
import { applyAgentCommission } from "@/lib/ajan/commission";
import { verifyKesyeSession, KESYE_SESSION_COOKIE_NAME } from "@/lib/kesye/session-cookie";
import { notifyRechargeSuccess } from "@/lib/notify/resend-notifications";
import { assertRechargeAllowed } from "@/lib/security/recharge-guards";
import { runAfterSuccessfulRecharge } from "@/lib/recharge/post-success";

export async function POST(req: Request) {
  let body: RechargeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  /** Paiement carte : Stripe Checkout (edge `kreye-checkout`) → webhook → `voye-recharge`. Pas d’envoi Reloadly ici. */
  if (body.paymentMethod !== "cash") {
    return NextResponse.json(
      {
        success: false,
        error:
          body.paymentMethod === "stripe"
            ? "Peman kat: itilize bouton Stripe sou fòm la (pa voye dirèkman isit la)."
            : "Selman peman kès (cash) otorize sou wout sa a.",
      },
      { status: 400 },
    );
  }

  const cookieRef = cookies().get("monican_ref")?.value;
  const refKod = (body as { refKod?: string }).refKod || cookieRef || null;
  const ref = refKod ? String(refKod).trim() || null : null;

  const sb = createClient();
  let userId: string | null = null;
  let userEmail: string | null = body.userEmail ?? null;
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    userId = user?.id ?? null;
    userEmail = user?.email ?? userEmail;
  }

  const built = buildRechargeFromBody(body, ref);
  if (!built.ok) return NextResponse.json({ success: false, error: built.error }, { status: 400 });

  const kesyeId = verifyKesyeSession(cookies().get(KESYE_SESSION_COOKIE_NAME)?.value);
  let record: RechargeRecord = { ...built.record };
  if (kesyeId) {
    record = { ...record, channel: "caisse", kesye_id: kesyeId };
  }

  const h = headers();
  const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";

  const guard = await assertRechargeAllowed({
    body,
    finalAmountUsd: built.finalAmount,
    userId,
    userEmail,
    clientIp,
    channel: record.channel,
  });
  if (!guard.ok) {
    return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
  }

  const shipped = await sendCashRechargeViaReloadly({ body, built, record, userId });
  if (!shipped.ok) {
    return NextResponse.json({ success: false, error: shipped.error }, { status: shipped.status });
  }

  const okRecord = shipped.record;
  const com = await applyAgentCommission({
    refKod: ref,
    tranzaksyonRef: okRecord.reference,
    montantVannUsd: built.finalAmount,
  });
  if (!com.ok) console.warn("Commission agent:", com.error);

  await notifyRechargeSuccess(okRecord);
  await runAfterSuccessfulRecharge({
    userId,
    record: okRecord,
    finalAmountUsd: built.finalAmount,
    context: "normal",
  });

  return NextResponse.json({ success: true, ...okRecord });
}

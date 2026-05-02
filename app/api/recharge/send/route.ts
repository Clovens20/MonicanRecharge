import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { buildRechargeFromBody, type RechargeBody, type RechargeRecord } from "@/lib/recharge/executeSend";
import { sendCashRechargeViaReloadly } from "@/lib/recharge/cashViaReloadly";
import { computeAgentPlatformFeeUsd } from "@/lib/recharge/agentPlatformFee";
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

  const minAgentProfit = parseFloat(process.env.AGENT_MIN_PROFIT_USD || "0.5");
  const isAgentChannel = body.channelHint === "ajan";
  let agentPlatformFeeUsd = 0;
  if (isAgentChannel) {
    const sell = typeof body.sellAmountUsd === "number" ? body.sellAmountUsd : NaN;
    if (!Number.isFinite(sell) || sell <= 0) {
      return NextResponse.json({ success: false, error: "Pri kliyan an obligatwa pou ajan." }, { status: 400 });
    }
    agentPlatformFeeUsd = computeAgentPlatformFeeUsd(sell);
    const profitNet = Math.round((sell - built.finalAmount - agentPlatformFeeUsd) * 100) / 100;
    if (profitNet + 0.0001 < minAgentProfit) {
      return NextResponse.json(
        { success: false, error: `Benefis minimòm ajan se $${minAgentProfit.toFixed(2)} (apre frè platfòm).` },
        { status: 400 }
      );
    }
  }

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

  let agentDebited = false;
  let agentOldBalance = 0;
  if (record.channel === "ajan" && userId) {
    const svc = getServiceSupabase();
    if (!svc) {
      return NextResponse.json({ success: false, error: "Service role manke" }, { status: 503 });
    }
    const { data: ag, error: agErr } = await svc.from("ajan").select("balans_komisyon").eq("user_id", userId).maybeSingle();
    if (agErr || !ag) {
      return NextResponse.json({ success: false, error: "Kont ajan pa jwenn" }, { status: 403 });
    }
    const bal = Number(ag.balans_komisyon || 0);
    const totalDebit = Math.round((built.finalAmount + agentPlatformFeeUsd) * 100) / 100;
    if (bal + 0.0001 < totalDebit) {
      return NextResponse.json({ success: false, error: "Solde ajan ensifizan." }, { status: 400 });
    }
    const newBal = Math.round((bal - totalDebit) * 100) / 100;
    const { error: upErr } = await svc.from("ajan").update({ balans_komisyon: newBal }).eq("user_id", userId);
    if (upErr) {
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
    }
    agentDebited = true;
    agentOldBalance = bal;
  }

  const shipped = await sendCashRechargeViaReloadly({
    body,
    built,
    record,
    userId,
    platformFeeUsd: record.channel === "ajan" ? agentPlatformFeeUsd : 0,
  });
  if (!shipped.ok) {
    if (agentDebited && userId) {
      const svc = getServiceSupabase();
      if (svc) await svc.from("ajan").update({ balans_komisyon: agentOldBalance }).eq("user_id", userId);
    }
    return NextResponse.json({ success: false, error: shipped.error }, { status: shipped.status });
  }

  const okRecord = shipped.record;
  if (record.channel !== "ajan") {
    const com = await applyAgentCommission({
      refKod: ref,
      tranzaksyonRef: okRecord.reference,
      montantVannUsd: built.finalAmount,
    });
    if (!com.ok) console.warn("Commission agent:", com.error);
  }

  await notifyRechargeSuccess(okRecord);
  await runAfterSuccessfulRecharge({
    userId,
    record: okRecord,
    finalAmountUsd: built.finalAmount,
    context: "normal",
  });

  return NextResponse.json({ success: true, ...okRecord });
}

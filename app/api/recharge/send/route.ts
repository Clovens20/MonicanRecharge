import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { buildRechargeFromBody, type RechargeBody, type RechargeRecord } from "@/lib/recharge/executeSend";
import { getGlobalMarkupConfig } from "@/lib/admin/markup-settings";
import { sendPaidRechargeViaReloadly } from "@/lib/recharge/cashViaReloadly";
import { computeAgentPlatformFeeUsd } from "@/lib/recharge/agentPlatformFee";
import { applyAgentCommission } from "@/lib/ajan/commission";
import { verifyKesyeSession, KESYE_SESSION_COOKIE_NAME } from "@/lib/kesye/session-cookie";
import { notifyRechargeSuccess } from "@/lib/notify/resend-notifications";
import { assertRechargeAllowed } from "@/lib/security/recharge-guards";
import { runAfterSuccessfulRecharge } from "@/lib/recharge/post-success";
import { getStripeTerminalServer } from "@/lib/stripe-terminal/server";

export async function POST(req: Request) {
  let body: RechargeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  /** Paiement carte en ligne : Stripe Checkout (edge `kreye-checkout`) → webhook → `voye-recharge`. Pas d’envoi Reloadly ici. */
  if (body.paymentMethod !== "cash" && body.paymentMethod !== "stripe_terminal") {
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

  const markup = await getGlobalMarkupConfig();
  const builtResult = buildRechargeFromBody(body, ref, markup);
  if (!builtResult.ok) {
    const error = (builtResult as { ok: false; error: string }).error;
    return NextResponse.json({ success: false, error }, { status: 400 });
  }
  const built = builtResult;

  const minAgentProfit = parseFloat(process.env.AGENT_MIN_PROFIT_USD || "0.5");
  const isAgentChannel = body.channelHint === "ajan";
  let agentPlatformFeeUsd = 0;
  if (isAgentChannel) {
    const sell = typeof body.sellAmountUsd === "number" ? body.sellAmountUsd : NaN;
    if (!Number.isFinite(sell) || sell <= 0) {
      return NextResponse.json({ success: false, error: "Pri kliyan an obligatwa pou ajan." }, { status: 400 });
    }
    agentPlatformFeeUsd = computeAgentPlatformFeeUsd(sell);
    const profitNet = Math.round((sell - built.reloadlyCostUsd - agentPlatformFeeUsd) * 100) / 100;
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
  if (body.paymentMethod === "stripe_terminal") {
    if (!kesyeId) {
      return NextResponse.json({ success: false, error: "Stripe Terminal mande yon sesyon kèsye aktif." }, { status: 403 });
    }

    const stripePaymentIntentId = String(body.stripePaymentIntentId || "").trim();
    if (!stripePaymentIntentId) {
      return NextResponse.json({ success: false, error: "stripePaymentIntentId obligatwa." }, { status: 400 });
    }

    const stripe = getStripeTerminalServer();
    if (!stripe) {
      return NextResponse.json({ success: false, error: "STRIPE_SECRET_KEY manquant." }, { status: 503 });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      const expectedAmount = Math.round(built.finalAmount * 100);
      const metadataSource = String(paymentIntent.metadata?.source || "");
      const metadataKesyeId = String(paymentIntent.metadata?.kesye_id || "");
      if (!["requires_capture", "succeeded"].includes(paymentIntent.status)) {
        return NextResponse.json(
          { success: false, error: `PaymentIntent Stripe invalide pour la caisse: ${paymentIntent.status}` },
          { status: 400 },
        );
      }
      if (paymentIntent.capture_method !== "manual") {
        return NextResponse.json(
          { success: false, error: "Le paiement Terminal doit utiliser capture_method=manual." },
          { status: 400 },
        );
      }
      if (paymentIntent.currency.toLowerCase() !== "usd") {
        return NextResponse.json({ success: false, error: "Le paiement Terminal doit etre en USD." }, { status: 400 });
      }
      if (paymentIntent.amount !== expectedAmount) {
        return NextResponse.json(
          {
            success: false,
            error: `Montant Stripe Terminal inattendu (${(paymentIntent.amount / 100).toFixed(2)} USD).`,
          },
          { status: 400 },
        );
      }
      if (metadataSource && metadataSource !== "pos_terminal_m2") {
        return NextResponse.json({ success: false, error: "PaymentIntent Stripe Terminal non reconnu." }, { status: 400 });
      }
      if (metadataKesyeId && metadataKesyeId !== kesyeId) {
        return NextResponse.json({ success: false, error: "Ce paiement Terminal appartient a une autre session kèsye." }, { status: 400 });
      }
    } catch (error) {
      console.error("Stripe Terminal verify payment intent error:", error);
      return NextResponse.json({ success: false, error: "Verification Stripe Terminal impossible." }, { status: 500 });
    }
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
    const error = (guard as { ok: false; error: string; status: number }).error;
    const status = (guard as { ok: false; error: string; status: number }).status;
    return NextResponse.json({ success: false, error }, { status });
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
    const totalDebit = Math.round((built.reloadlyCostUsd + agentPlatformFeeUsd) * 100) / 100;
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

  const shipped = await sendPaidRechargeViaReloadly({
    body,
    built,
    record,
    userId,
    platformFeeUsd: record.channel === "ajan" ? agentPlatformFeeUsd : 0,
    paymentMethod: body.paymentMethod === "stripe_terminal" ? "stripe_terminal" : "cash",
    stripePaymentId: body.paymentMethod === "stripe_terminal" ? String(body.stripePaymentIntentId || "").trim() || null : null,
  });
  if (!shipped.ok) {
    if (agentDebited && userId) {
      const svc = getServiceSupabase();
      if (svc) await svc.from("ajan").update({ balans_komisyon: agentOldBalance }).eq("user_id", userId);
    }
    const error = (shipped as { ok: false; error: string; status: number }).error;
    const status = (shipped as { ok: false; error: string; status: number }).status;
    return NextResponse.json({ success: false, error }, { status });
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

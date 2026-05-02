import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import Stripe from "npm:stripe@17.4.0";

/**
 * Webhook Stripe (checkout.session.completed) :
 * - Recharge kliyan : met `tranzaksyon` + envoye `voye-recharge`.
 * - Top-up ajan (kind=ajan_topup) : kredi `balans_komisyon` + `ajan_topup_card` (idempotent, menm lojik ke `/api/ajan/topup/confirm`).
 * Secrets : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
async function creditAjanTopupFromSession(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; skip?: string; error?: string }> {
  const meta = session.metadata ?? {};
  if (String(meta.kind || "") !== "ajan_topup") {
    return { ok: false, skip: "not_ajan_topup" };
  }

  const ajanUserId = String(meta.ajanUserId || "").trim();
  const amountUsd = Number(meta.amountUsd);
  if (session.payment_status !== "paid") {
    return { ok: false, error: `payment_status=${session.payment_status}` };
  }
  if (!ajanUserId || !Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, error: "invalid_ajan_metadata" };
  }

  const sessionId = session.id;
  const { data: already } = await supabase
    .from("ajan_topup_card")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (already?.id) {
    return { ok: true, skip: "already_credited" };
  }

  const { data: ag, error: eAg } = await supabase
    .from("ajan")
    .select("balans_komisyon")
    .eq("user_id", ajanUserId)
    .maybeSingle();
  if (eAg || !ag) {
    return { ok: false, error: eAg?.message || "ajan_not_found" };
  }

  const balBefore = Number(ag.balans_komisyon || 0);
  const balAfter = Math.round((balBefore + amountUsd) * 100) / 100;

  const pi = session.payment_intent;
  const paymentIntentId = typeof pi === "string" ? pi : pi?.id ?? null;

  const { error: eIns } = await supabase.from("ajan_topup_card").insert({
    ajan_id: ajanUserId,
    montant_usd: amountUsd,
    stripe_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    estati: "kredi",
  });
  if (eIns) {
    if (String(eIns.message).includes("duplicate") || String(eIns.code) === "23505") {
      return { ok: true, skip: "duplicate_insert" };
    }
    return { ok: false, error: eIns.message };
  }

  const { error: eUp } = await supabase.from("ajan").update({ balans_komisyon: balAfter }).eq("user_id", ajanUserId);
  if (eUp) {
    await supabase.from("ajan_topup_card").delete().eq("stripe_session_id", sessionId);
    return { ok: false, error: eUp.message };
  }

  return { ok: true };
}

async function notifyAdminAjanTopupIfEnabled(
  supabase: SupabaseClient,
  params: { ajanUserId: string; amountUsd: number; stripeSessionId: string },
): Promise<void> {
  const { data: row } = await supabase.from("admin_settings").select("valè").eq("kle", "ajan_topup_notify_admin").maybeSingle();
  const on = Boolean((row?.valè as { on?: boolean } | null)?.on);
  if (!on) return;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") || "onboarding@resend.dev";
  const to =
    (Deno.env.get("ADMIN_NOTIFY_EMAIL") || Deno.env.get("ADMIN_EMAILS") || "").split(",")[0]?.trim() || "";
  if (!resendKey || !to) return;

  const { data: ag } = await supabase.from("ajan").select("kòd_ajan").eq("user_id", params.ajanUserId).maybeSingle();
  const code = String(ag?.kòd_ajan || params.ajanUserId).slice(0, 32);

  const html = `<p>Top-up <strong>kredi marchand</strong> (Stripe) — ajan revandè.</p>
<ul><li>Montan: <strong>$${params.amountUsd.toFixed(2)}</strong> USD</li>
<li>Ajan: <code>${code}</code></li>
<li>Session: <code>${params.stripeSessionId}</code></li></ul>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `Monican Recharge <${from}>`,
      to: [to],
      subject: `Monican — top-up ajan $${params.amountUsd.toFixed(2)}`,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeSecret || !webhookSecret) {
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeSecret);
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    const topup = await creditAjanTopupFromSession(supabase, session);
    if (topup.ok || (topup.error && topup.error !== "not_ajan_topup")) {
      if (!topup.ok && topup.error) {
        console.error("verifye-stripe: ajan_topup failed", topup.error, meta);
      } else if (topup.ok && !topup.skip) {
        console.log("verifye-stripe: ajan_topup credited", session.id, meta.ajanUserId);
        const amt = Number(meta.amountUsd || 0);
        const uid = String(meta.ajanUserId || "").trim();
        if (Number.isFinite(amt) && amt > 0 && uid) {
          notifyAdminAjanTopupIfEnabled(supabase, {
            ajanUserId: uid,
            amountUsd: amt,
            stripeSessionId: session.id,
          }).catch((e) => console.warn("verifye-stripe: notify admin topup", e));
        }
      }
      if (String(meta.kind || "") === "ajan_topup") {
        return new Response(JSON.stringify({ received: true, ajan_topup: topup }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const transactionId = meta.transactionId;
    const operatorId = meta.operatorId;
    const recipientPhone = meta.recipientPhone;
    const countryCode = meta.countryCode ?? "HT";
    const amount = meta.amount;
    const tip = meta.tip ?? "airtime";
    const userId = meta.userId;
    const planId = meta.planId;

    if (!transactionId || !operatorId || !recipientPhone || amount == null) {
      console.error("verifye-stripe: metadata incomplete", meta);
      return new Response(JSON.stringify({ received: true, warning: "incomplete_metadata" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const pi = session.payment_intent;
    const paymentIntentId = typeof pi === "string" ? pi : pi?.id ?? null;

    await supabase
      .from("tranzaksyon")
      .update({
        stripe_payment_id: paymentIntentId ?? session.id,
        mòd_peman: "stripe",
      })
      .eq("id", transactionId);

    const fnUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/voye-recharge`;
    const invokeBody: Record<string, unknown> = {
      operatorId,
      recipientPhone,
      countryCode,
      amount: Number(amount),
      userId,
      transactionId,
      tip,
    };
    if (tip === "data_plan" && planId) {
      invokeBody.bundleId = planId;
    }

    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(invokeBody),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("verifye-stripe: voye-recharge failed", res.status, t);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

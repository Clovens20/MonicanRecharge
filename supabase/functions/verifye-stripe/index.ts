import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import Stripe from "npm:stripe@17.4.0";

/**
 * Webhook Stripe (checkout.session.completed) — met à jour `tranzaksyon` puis appelle `voye-recharge`.
 * Secrets : STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */
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

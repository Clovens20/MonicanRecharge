import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import Stripe from "npm:stripe@17.4.0";
import { corsOptions, jsonResponse } from "../_shared/cors.ts";

/**
 * Crée une session Stripe Checkout + ligne `tranzaksyon` (annatant).
 * JWT utilisateur requis (verify_jwt) — `user_id` pris depuis le token, pas depuis le body.
 *
 * POST : operatorId, operatorName, recipientPhone, countryCode, amount, tip?, planId? (data)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!stripeSecret) {
    return jsonResponse({ error: "STRIPE_SECRET_KEY manquant" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Non authentifié" }, 401);
  }

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData.user) {
    return jsonResponse({ error: "Session invalide" }, 401);
  }
  const userId = userData.user.id;

  try {
    const body = (await req.json()) as {
      operatorId?: number | string;
      operatorName?: string;
      recipientPhone?: string;
      countryCode?: string;
      amount?: number | string;
      tip?: string;
      planId?: string;
    };

    const {
      operatorId,
      operatorName,
      recipientPhone,
      countryCode = "HT",
      amount,
      tip = "airtime",
      planId,
    } = body;

    if (!operatorId || !operatorName || !recipientPhone || amount == null) {
      return jsonResponse({ error: "operatorId, operatorName, recipientPhone et amount requis" }, 400);
    }

    const prixKoutaj = Number(amount);
    if (!Number.isFinite(prixKoutaj) || prixKoutaj <= 0) {
      return jsonResponse({ error: "amount invalide" }, 400);
    }

    const prixVann = Math.ceil(prixKoutaj * 1.08 * 100) / 100;
    const benefis = prixVann - prixKoutaj;

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: tx, error } = await supabase
      .from("tranzaksyon")
      .insert({
        user_id: userId,
        operatè: operatorName,
        pays_kòd: String(countryCode).toUpperCase().slice(0, 2),
        nimewo_resevwa: String(recipientPhone),
        montant_usd: prixVann,
        pri_koutaj: prixKoutaj,
        pri_vann: prixVann,
        benefis,
        tip: tip || "airtime",
        plan_id: planId ?? null,
        mòd_peman: "stripe",
        estati: "annatant",
      })
      .select("id")
      .single();

    if (error || !tx) {
      return jsonResponse({ error: error?.message ?? "Insert tranzaksyon echwe" }, 500);
    }

    const stripe = new Stripe(stripeSecret);

    const appUrl = (Deno.env.get("PUBLIC_APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").replace(/\/$/, "");
    if (!appUrl) {
      return jsonResponse({ error: "PUBLIC_APP_URL ou NEXT_PUBLIC_APP_URL requis pour les URLs Stripe" }, 500);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Recharge ${String(operatorName).normalize("NFD").replace(/[\u0300-\u036f]/g, "")} - ${recipientPhone}`,
              description: `${tip === "airtime" ? "Airtime" : "Forfait data"} $${prixKoutaj}`,
            },
            unit_amount: Math.round(prixVann * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        transactionId: tx.id,
        operatorId: String(operatorId),
        recipientPhone: String(recipientPhone),
        countryCode: String(countryCode).toUpperCase().slice(0, 2),
        amount: String(prixKoutaj),
        tip: tip || "airtime",
        userId,
        planId: planId ?? "",
      },
      success_url: `${appUrl}/success?tx=${tx.id}`,
      cancel_url: `${appUrl}/?cancelled=true`,
    });

    await supabase.from("tranzaksyon").update({ stripe_payment_id: session.id }).eq("id", tx.id);

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});

// @ts-nocheck
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
      refKod?: string;
    };

    const {
      operatorId,
      operatorName,
      recipientPhone,
      countryCode = "HT",
      amount,
      tip = "airtime",
      planId,
      refKod,
    } = body;

    if (!operatorId || !operatorName || !recipientPhone || amount == null) {
      return jsonResponse({ error: "operatorId, operatorName, recipientPhone et amount requis" }, 400);
    }

    const operatorIdNum = Number(operatorId);
    if (!Number.isFinite(operatorIdNum) || operatorIdNum <= 0) {
      return jsonResponse({ error: "operatorId invalide" }, 400);
    }

    const prixKoutaj = Number(amount);
    if (!Number.isFinite(prixKoutaj) || prixKoutaj <= 0) {
      return jsonResponse({ error: "amount invalide" }, 400);
    }

    const prixVann = Math.ceil(prixKoutaj * 1.08 * 100) / 100;
    const benefisBrut = prixVann - prixKoutaj;

    const supabase = createClient(supabaseUrl, serviceKey);

    const refSan = String(refKod || "")
      .trim()
      .replace(/[^A-Za-z0-9\-_]/g, "")
      .slice(0, 48);
    let ref_kòd: string | null = null;
    let ajan_id: string | null = null;
    let komisyon_ajan = 0;
    let komisyon_pousantaj: number | null = null;
    if (refSan.length >= 4) {
      const { data: ag } = await supabase.from("ajan").select("user_id, to_komisyon, estati").eq("kòd_ajan", refSan).maybeSingle();
      if (ag?.estati === "aktif") {
        const pct = Number(ag.to_komisyon ?? 5);
        const p = Number.isFinite(pct) && pct > 0 ? pct : 5;
        ref_kòd = refSan;
        ajan_id = ag.user_id;
        komisyon_pousantaj = p;
        komisyon_ajan = Math.round(prixVann * (p / 100) * 100) / 100;
      }
    }
    const benefisNet = Math.round((benefisBrut - komisyon_ajan) * 100) / 100;

    const insertRow: Record<string, unknown> = {
      user_id: userId,
      operator_id: operatorIdNum,
      operatè: operatorName,
      pays_kòd: String(countryCode).toUpperCase().slice(0, 2),
      nimewo_resevwa: String(recipientPhone),
      montant_usd: prixVann,
      pri_koutaj: prixKoutaj,
      pri_vann: prixVann,
      benefis: benefisNet,
      tip: tip || "airtime",
      plan_id: planId ?? null,
      mòd_peman: "stripe",
      estati: "annatant",
    };
    if (ref_kòd) {
      insertRow.ref_kòd = ref_kòd;
      insertRow.ajan_id = ajan_id;
      insertRow.komisyon_ajan = komisyon_ajan;
      insertRow.komisyon_pousantaj = komisyon_pousantaj;
    }

    const { data: tx, error } = await supabase.from("tranzaksyon").insert(insertRow).select("id").single();

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
        refKod: ref_kòd ?? "",
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

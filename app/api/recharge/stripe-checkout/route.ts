import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

/** Libellés Stripe : ASCII sans accents (ex. Haïti → Haiti). */
function stripDiacritics(s: string): string {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** URL publique pour success/cancel Stripe (obligatoire). */
function appBaseUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (u) return u;
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return null;
}

/**
 * Crée une session Stripe Checkout + ligne `tranzaksyon` (annatant).
 * Utilise STRIPE_SECRET_KEY et SUPABASE_SERVICE_ROLE_KEY depuis le .env Next
 * (le déploiement local / Vercel), contrairement à l’edge `kreye-checkout`.
 */
export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error:
          "STRIPE_SECRET_KEY manquant : ajoutez-le dans .env à la racine du projet Next (redémarrez npm run dev).",
      },
      { status: 503 },
    );
  }

  const base = appBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_APP_URL manquant (ex. http://localhost:3100) — requis pour les URLs de retour Stripe.",
      },
      { status: 503 },
    );
  }

  const sb = createClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  }

  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();
  if (authErr || !user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const svc = getServiceSupabase();
  if (!svc) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquant dans .env (insertion tranzaksyon)" },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const operatorId = body.operatorId;
  const operatorName = body.operatorName;
  const recipientPhone = body.recipientPhone;
  const countryCode = (body.countryCode as string) || "HT";
  const amount = body.amount;
  const tip = (body.tip as string) || "airtime";
  const planId = body.planId as string | undefined;

  if (operatorId == null || !operatorName || !recipientPhone || amount == null) {
    return NextResponse.json({ error: "operatorId, operatorName, recipientPhone et amount requis" }, { status: 400 });
  }

  const operatorIdNum = Number(operatorId);
  if (!Number.isFinite(operatorIdNum) || operatorIdNum <= 0) {
    return NextResponse.json({ error: "operatorId invalide" }, { status: 400 });
  }

  const prixKoutaj = Number(amount);
  if (!Number.isFinite(prixKoutaj) || prixKoutaj <= 0) {
    return NextResponse.json({ error: "amount invalide" }, { status: 400 });
  }

  const prixVann = Math.ceil(prixKoutaj * 1.08 * 100) / 100;
  const benefis = prixVann - prixKoutaj;

  const { data: tx, error: insErr } = await svc
    .from("tranzaksyon")
    .insert({
      user_id: user.id,
      operator_id: operatorIdNum,
      operatè: String(operatorName),
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

  if (insErr || !tx?.id) {
    return NextResponse.json({ error: insErr?.message ?? "Insert tranzaksyon echwe" }, { status: 500 });
  }

  const txId = String(tx.id);
  const stripe = new Stripe(stripeKey, { typescript: true });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Recharge ${stripDiacritics(String(operatorName))} - ${recipientPhone}`,
              description: `${tip === "airtime" ? "Airtime" : "Forfait data"} $${prixKoutaj}`,
            },
            unit_amount: Math.round(prixVann * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        transactionId: txId,
        operatorId: String(operatorId),
        recipientPhone: String(recipientPhone),
        countryCode: String(countryCode).toUpperCase().slice(0, 2),
        amount: String(prixKoutaj),
        tip: tip || "airtime",
        userId: user.id,
        planId: planId ?? "",
      },
      success_url: `${base}/success?tx=${txId}`,
      cancel_url: `${base}/?cancelled=true`,
    });

    await svc.from("tranzaksyon").update({ stripe_payment_id: session.id }).eq("id", txId);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

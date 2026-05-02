import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { stripeCheckoutPublicBaseUrl } from "@/lib/stripe-app-base-url";

/** Libellés Stripe : ASCII sans accents (ex. Haïti → Haiti). */
function stripDiacritics(s: string): string {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

  const base = stripeCheckoutPublicBaseUrl();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "URL publique Stripe absente ou invalide (localhost interdit en production). Définissez APP_URL ou NEXT_PUBLIC_APP_URL (ex. https://recharge.monican.shop).",
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
  const bodyRef = String((body as { refKod?: string }).refKod || "").trim();
  const cookieRef = cookies().get("monican_ref")?.value?.trim() || "";
  const refSan = (bodyRef || cookieRef).replace(/[^A-Za-z0-9\-_]/g, "").slice(0, 48);

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
  const benefisBrut = prixVann - prixKoutaj;

  let ref_kòd: string | null = null;
  let ajan_id: string | null = null;
  let komisyon_ajan = 0;
  let komisyon_pousantaj: number | null = null;
  if (refSan.length >= 4) {
    const { data: ag } = await svc.from("ajan").select("user_id, to_komisyon, estati").eq("kòd_ajan", refSan).maybeSingle();
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
    user_id: user.id,
    operator_id: operatorIdNum,
    operatè: String(operatorName),
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

  const { data: tx, error: insErr } = await svc.from("tranzaksyon").insert(insertRow as never).select("id").single();

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
        refKod: ref_kòd ?? "",
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

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DATA_PLANS, OPERATORS } from "@/lib/reloadly/mock";
import type { TxLocal } from "@/lib/store";

type Row = {
  id: string;
  operatè: string | null;
  pays_kòd: string | null;
  nimewo_resevwa: string | null;
  montant_usd: number | string | null;
  pri_koutaj: number | string | null;
  tip: string | null;
  plan_id: string | null;
  mòd_peman: string | null;
  estati: string | null;
  created_at: string;
};

function mapEstati(s: string | null): TxLocal["status"] {
  const u = (s || "").toLowerCase();
  if (u === "siksè" || u === "successful") return "siksè";
  if (u === "echwe" || u === "ranbouse") return "echwe";
  return "annatant";
}

function mapRow(row: Row, userEmail: string | undefined): TxLocal {
  const opName = (row.operatè || "").trim();
  let op = OPERATORS.find((o) => o.name === opName);
  if (!op && row.pays_kòd) {
    op = OPERATORS.find((o) => o.countryCode === String(row.pays_kòd).toUpperCase());
  }
  if (!op) op = OPERATORS[0];

  const cc = String(row.pays_kòd || op.countryCode || "HT").toUpperCase().slice(0, 2);
  const dial = cc === "HT" ? "+509" : cc === "US" ? "+1" : "+";
  const num = String(row.nimewo_resevwa || "").replace(/\D/g, "");
  const recipient = num ? `${dial} ${num}` : dial;

  /** `montant_usd` = prix facturé (ex. marge Stripe) ; `pri_koutaj` = montant recharge opérateur. */
  const amountUsd = Number(row.montant_usd ?? row.pri_koutaj ?? 0);
  const amountDisplay = Number.isFinite(amountUsd) ? amountUsd : 0;

  const tip = (row.tip || "airtime").toLowerCase();
  const type: TxLocal["type"] = tip === "data_plan" ? "data_plan" : "airtime";
  const planName =
    type === "data_plan" && row.plan_id ? DATA_PLANS.find((p) => p.id === row.plan_id)?.name ?? null : null;

  const pm = row.mòd_peman;
  const payment_method: TxLocal["payment_method"] =
    pm === "cash" ? "cash" : pm === "moncash" ? "moncash" : "stripe";

  return {
    id: row.id,
    reference: `TX-${String(row.id).replace(/-/g, "").slice(0, 10)}`,
    user_email: userEmail ?? null,
    operator: op.name,
    operator_id: op.id,
    flag: op.flag,
    country_code: op.countryCode,
    recipient,
    amount_usd: amountDisplay,
    amount_local: Math.round(amountDisplay * op.fxRate * 100) / 100,
    currency: op.currency,
    type,
    plan: planName,
    status: mapEstati(row.estati),
    payment_method,
    created_at: row.created_at,
  };
}

/** Historique côté Supabase (Stripe Checkout, webhooks) — lecture RLS `tranzaksyon_own_read`. */
export async function GET() {
  const sb = createClient();
  if (!sb) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await sb
    .from("tranzaksyon")
    .select("id, operatè, pays_kòd, nimewo_resevwa, montant_usd, pri_koutaj, tip, plan_id, mòd_peman, estati, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const transactions = (data || []).map((r) => mapRow(r as Row, user.email ?? undefined));
  return NextResponse.json({ transactions });
}

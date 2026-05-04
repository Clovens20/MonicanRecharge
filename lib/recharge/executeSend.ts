import { randomBytes, randomUUID } from "crypto";
import { DATA_PLANS, OPERATORS, type Operator } from "@/lib/reloadly/mock";
import { countryByCode, dialForCountry } from "@/lib/reloadly/countries";
import { getDb } from "@/lib/mongodb";
import { applyAgentCommission } from "@/lib/ajan/commission";
import { calculateFinalPrice, type MarkupConfig } from "@/lib/markup";

export type RechargeBody = {
  operatorId?: number;
  recipientPhone?: { countryCode?: string; number?: string };
  amount?: number | null;
  type?: "airtime" | "data_plan";
  planId?: string | null;
  paymentMethod?: "stripe" | "moncash" | "cash";
  userEmail?: string | null;
  /** Lè vann depi tablo kès (tablèt). */
  channelHint?: "caisse" | "online" | "ajan";
  /** Opérateur détecté Reloadly absent du mock `OPERATORS`. */
  operatorDisplayName?: string;
  operatorCurrency?: string;
  operatorFxRate?: number;
  operatorLogoUrl?: string | null;
  /** Prix final payé par le client (utile pour agent/revendeur en cash). */
  sellAmountUsd?: number | null;
};

export type RechargeRecord = {
  id: string;
  reference: string;
  operator_id: number;
  operator: string;
  country_code: string;
  recipient: string;
  amount_usd: number;
  amount_local: number;
  currency: string;
  type: "airtime" | "data_plan";
  plan_id: string | null;
  payment_method: "stripe" | "moncash" | "cash";
  user_email: string | null;
  status: "siksè" | "annatant" | "echwe";
  created_at: string;
  mock: boolean;
  ajan_kod: string | null;
  channel: "online" | "moncash_manual" | "caisse" | "ajan";
  retry_count?: number;
  cost_usd?: number;
  kesye_id?: string | null;
};

function genRef() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  const buf = randomBytes(8);
  for (let i = 0; i < 8; i++) s += chars[buf[i] % chars.length];
  return `MR-${s}`;
}

/** Estimation coût interne Reloadly (USD) — daprè montant nominal voye nan API a. */
function estimateCostUsd(reloadlyDenominationUsd: number): number {
  const rate = parseFloat(process.env.RELOADLY_COST_RATIO || "0.92");
  return Math.round(reloadlyDenominationUsd * rate * 100) / 100;
}

export type BuildRechargeOk = {
  ok: true;
  record: RechargeRecord;
  /** Pri total kliyan (même chif li peye — markup inclusif sou non-ajan). */
  finalAmount: number;
  /** Montant nominal voye nan Reloadly (aprè retire markup sou non-ajan). */
  reloadlyCostUsd: number;
  /** % markup global nan config (0 si disabled oswa vann ajan). */
  markupPctApplied: number;
};

export function buildRechargeFromBody(
  body: RechargeBody,
  refKod: string | null,
  markup: MarkupConfig,
): BuildRechargeOk | { ok: false; error: string } {
  const ccRaw = body.recipientPhone?.countryCode;
  const cc = String(ccRaw || "").toUpperCase().slice(0, 2);
  const num = body.recipientPhone?.number;
  if (!cc || !num) return { ok: false, error: "Missing recipient" };

  let op: Operator | undefined = OPERATORS.find((o) => o.id === body.operatorId);
  if (!op && body.operatorId && body.operatorDisplayName) {
    const row = countryByCode(cc);
    op = {
      id: body.operatorId,
      name: String(body.operatorDisplayName),
      countryCode: cc,
      countryName: row?.name || cc,
      flag: row?.flag || "🌍",
      logoUrl: body.operatorLogoUrl || "/operators/orange.svg",
      fxRate: typeof body.operatorFxRate === "number" && Number.isFinite(body.operatorFxRate) ? body.operatorFxRate : 1,
      currency: body.operatorCurrency || "USD",
      prefixes: [],
      type: "airtime",
    };
  }
  if (!op) return { ok: false, error: "Operator not found" };

  let customerPaysUsd = Number(body.amount ?? 0);
  if (body.type === "data_plan" && body.planId) {
    const plan = DATA_PLANS.find((p) => p.id === body.planId);
    if (!plan) return { ok: false, error: "Plan not found" };
    customerPaysUsd = plan.priceUsd;
  }
  if (!customerPaysUsd || customerPaysUsd <= 0) return { ok: false, error: "Invalid amount" };

  const isAgentWallet = body.channelHint === "ajan";
  let saleAmountUsd: number;
  /** Nominal Reloadly (API) — sou non-ajan: aprè retire markup sou `customerPaysUsd`. */
  let reloadlyCostUsd: number;
  let markupPctApplied = 0;
  if (isAgentWallet) {
    reloadlyCostUsd = customerPaysUsd;
    const rawSell = typeof body.sellAmountUsd === "number" ? body.sellAmountUsd : Number.NaN;
    if (!Number.isFinite(rawSell) || rawSell <= 0) {
      return { ok: false, error: "Pri kliyan an obligatwa pou ajan." };
    }
    const sell = Math.round(rawSell * 100) / 100;
    if (sell + 0.0001 < reloadlyCostUsd) {
      return { ok: false, error: "Pri vann pa ka pi piti pase pri recharge a." };
    }
    saleAmountUsd = sell;
  } else {
    const calc = calculateFinalPrice(customerPaysUsd, markup);
    saleAmountUsd = calc.finalPrice;
    reloadlyCostUsd = calc.costPrice;
    markupPctApplied = markup.enabled ? markup.percentage : 0;
  }

  const maxTx = parseFloat(process.env.RECHARGE_MAX_USD || "100");
  if (saleAmountUsd > maxTx) {
    return { ok: false, error: `Montan depase max ($${maxTx})` };
  }

  const txId = randomUUID();
  const reference = genRef();
  const dial = dialForCountry(cc);
  const pay = body.paymentMethod ?? "stripe";
  const channel: RechargeRecord["channel"] = body.channelHint === "ajan"
    ? "ajan"
    : refKod
      ? "ajan"
      : body.channelHint === "caisse"
      ? "caisse"
      : pay === "moncash"
        ? "moncash_manual"
        : "online";
  const cost = estimateCostUsd(reloadlyCostUsd);

  const record: RechargeRecord = {
    id: txId,
    reference,
    operator_id: op.id,
    operator: op.name,
    country_code: cc,
    recipient: `${dial} ${num}`,
    amount_usd: saleAmountUsd,
    amount_local: Math.round(saleAmountUsd * op.fxRate),
    currency: op.currency,
    type: body.type ?? "airtime",
    plan_id: body.planId ?? null,
    payment_method: pay,
    user_email: body.userEmail ?? null,
    status: "siksè",
    created_at: new Date().toISOString(),
    mock: true,
    ajan_kod: refKod,
    channel,
    retry_count: 0,
    cost_usd: cost,
  };

  return {
    ok: true,
    record,
    finalAmount: saleAmountUsd,
    reloadlyCostUsd,
    markupPctApplied,
  };
}

export async function persistRechargeAndCommission(
  record: RechargeRecord,
  finalAmountUsd: number,
  refKod: string | null,
  options?: { delayMs?: number }
): Promise<void> {
  if (options?.delayMs) await new Promise((r) => setTimeout(r, options.delayMs));
  try {
    const db = await getDb();
    if (db) {
      // Lè Reloadly echwe: insertOne ak status "echwe", retry_payload: RechargeBody, retry_count: 0 — cron /api/cron/retry-echwe ap relanse.
      await db.collection("tranzaksyon").insertOne({ ...record });
    }
  } catch (e) {
    console.warn("Mongo insert failed:", e);
  }
  const com = await applyAgentCommission({
    refKod,
    tranzaksyonRef: record.reference,
    montantVannUsd: finalAmountUsd,
  });
  if (!com.ok) console.warn("Commission agent:", com.error);
}

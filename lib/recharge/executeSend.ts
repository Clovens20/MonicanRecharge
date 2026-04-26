import { randomBytes, randomUUID } from "crypto";
import { DATA_PLANS, OPERATORS } from "@/lib/reloadly/mock";
import { getDb } from "@/lib/mongodb";
import { applyAgentCommission } from "@/lib/ajan/commission";

export type RechargeBody = {
  operatorId?: number;
  recipientPhone?: { countryCode?: string; number?: string };
  amount?: number | null;
  type?: "airtime" | "data_plan";
  planId?: string | null;
  paymentMethod?: "stripe" | "moncash" | "cash";
  userEmail?: string | null;
  /** Lè vann depi tablo kès (tablèt). */
  channelHint?: "caisse" | "online";
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

/** Coût Reloadly mock (USD) — ajuster quand API réelle branchée. */
function estimateCostUsd(sellUsd: number): number {
  const rate = parseFloat(process.env.RELOADLY_COST_RATIO || "0.92");
  return Math.round(sellUsd * rate * 100) / 100;
}

export function buildRechargeFromBody(
  body: RechargeBody,
  refKod: string | null
): { ok: true; record: RechargeRecord; finalAmount: number } | { ok: false; error: string } {
  const op = OPERATORS.find((o) => o.id === body.operatorId);
  if (!op) return { ok: false, error: "Operator not found" };
  const cc = body.recipientPhone?.countryCode;
  const num = body.recipientPhone?.number;
  if (!cc || !num) return { ok: false, error: "Missing recipient" };

  let finalAmount = body.amount ?? 0;
  if (body.type === "data_plan" && body.planId) {
    const plan = DATA_PLANS.find((p) => p.id === body.planId);
    if (!plan) return { ok: false, error: "Plan not found" };
    finalAmount = plan.priceUsd;
  }
  if (!finalAmount || finalAmount <= 0) return { ok: false, error: "Invalid amount" };

  const maxTx = parseFloat(process.env.RECHARGE_MAX_USD || "100");
  if (Number(finalAmount) > maxTx) {
    return { ok: false, error: `Montan depase max ($${maxTx})` };
  }

  const txId = randomUUID();
  const reference = genRef();
  const dial = cc === "HT" ? "+509" : "+1";
  const pay = body.paymentMethod ?? "stripe";
  const channel: RechargeRecord["channel"] = refKod
    ? "ajan"
    : body.channelHint === "caisse"
      ? "caisse"
      : pay === "moncash"
        ? "moncash_manual"
        : "online";
  const cost = estimateCostUsd(Number(finalAmount));

  const record: RechargeRecord = {
    id: txId,
    reference,
    operator_id: op.id,
    operator: op.name,
    country_code: cc,
    recipient: `${dial} ${num}`,
    amount_usd: Number(finalAmount),
    amount_local: Math.round(Number(finalAmount) * op.fxRate),
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

  return { ok: true, record, finalAmount: Number(finalAmount) };
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

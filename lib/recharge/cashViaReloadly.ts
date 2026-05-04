import { getServiceSupabase } from "@/lib/supabase/service";
import { DATA_PLANS } from "@/lib/reloadly/mock";
import type { RechargeBody, RechargeRecord } from "@/lib/recharge/executeSend";

function genRefFromUuid(id: string) {
  const compact = id.replace(/-/g, "").slice(0, 10).toUpperCase();
  return `MR-${compact}`;
}

function bundleIdForDataPlan(planId: string | null | undefined): number | null {
  if (!planId) return null;
  const plan = DATA_PLANS.find((p) => p.id === planId);
  if (plan?.reloadlyBundleId != null && Number.isFinite(plan.reloadlyBundleId)) {
    return plan.reloadlyBundleId;
  }
  const raw = process.env[`RELOADLY_BUNDLE_${planId.replace(/[^a-zA-Z0-9_-]/g, "_")}`];
  if (raw && /^\d+$/.test(String(raw).trim())) return parseInt(String(raw).trim(), 10);
  return null;
}

/**
 * Peman kès (cash) : anrejistre `tranzaksyon` (annatant) puis Edge `voye-recharge` → Reloadly.
 * Pa gen « siksè » san konfirmasyon Reloadly.
 */
export async function sendCashRechargeViaReloadly(params: {
  body: RechargeBody;
  built: { record: RechargeRecord; finalAmount: number; reloadlyCostUsd: number; markupPctApplied: number };
  /** Anrejistre kanal (caisse / online) ak kesye_id depi `/api/recharge/send`. */
  record: RechargeRecord;
  userId: string | null;
  /** Frè platfòm sou pri vann (ajan sèlman), USD. */
  platformFeeUsd?: number;
}): Promise<{ ok: true; record: RechargeRecord } | { ok: false; error: string; status: number }> {
  const { body, built, record: channelRecord, userId, platformFeeUsd: feeRaw } = params;
  const platformFeeUsd =
    Number.isFinite(feeRaw) && (feeRaw as number) > 0 ? Math.round((feeRaw as number) * 100) / 100 : 0;
  const svc = getServiceSupabase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!svc || !supabaseUrl || !serviceKey) {
    return {
      ok: false,
      error:
        "Sistèm pa konfigire pou voye recharge Reloadly (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL).",
      status: 503,
    };
  }

  const op = channelRecord;
  const cc = String(body.recipientPhone?.countryCode || "HT").toUpperCase().slice(0, 2);
  const num = String(body.recipientPhone?.number || "").replace(/\D/g, "");
  if (!num) return { ok: false, error: "Nimewo resevwa envalid", status: 400 };

  const tip = body.type === "data_plan" ? "data_plan" : "airtime";
  const planIdStr = body.planId ?? null;

  let bundleId: number | undefined;
  if (tip === "data_plan") {
    const bid = bundleIdForDataPlan(planIdStr);
    if (bid == null) {
      return {
        ok: false,
        error:
          "Forfait data: ID bundle Reloadly manke. Ajoute reloadlyBundleId nan DATA_PLANS oswa RELOADLY_BUNDLE_<planId> nan .env.",
        status: 400,
      };
    }
    bundleId = bid;
  }

  const prixKoutaj = Math.round(built.reloadlyCostUsd * 100) / 100;
  const rawSell = typeof body.sellAmountUsd === "number" ? body.sellAmountUsd : Number.NaN;
  const prixVann =
    Number.isFinite(rawSell) && rawSell > 0 ? Math.round(rawSell * 100) / 100 : Math.round(built.finalAmount * 100) / 100;
  if (prixVann + 0.0001 < prixKoutaj) {
    return { ok: false, error: "Pri vann pa ka pi piti pase pri recharge a.", status: 400 };
  }
  const benefis = Math.round((prixVann - prixKoutaj - platformFeeUsd) * 100) / 100;
  const { data: inserted, error: insErr } = await svc
    .from("tranzaksyon")
    .insert({
      user_id: userId,
      operator_id: op.operator_id,
      operatè: op.operator,
      pays_kòd: cc,
      nimewo_resevwa: num,
      montant_usd: prixVann,
      pri_koutaj: prixKoutaj,
      pri_vann: prixVann,
      benefis,
      frais_platfòm_usd: platformFeeUsd,
      markup_pct_applied: built.markupPctApplied,
      tip,
      plan_id: planIdStr,
      mòd_peman: "cash",
      estati: "annatant",
    })
    .select("id, created_at")
    .single();

  if (insErr || !inserted?.id) {
    return {
      ok: false,
      error: insErr?.message || "Insert tranzaksyon echwe",
      status: 500,
    };
  }

  const transactionId = String(inserted.id);
  const fnUrl = `${supabaseUrl}/functions/v1/voye-recharge`;
  const invokeBody: Record<string, unknown> = {
    operatorId: op.operator_id,
    recipientPhone: num,
    countryCode: cc,
    amount: prixKoutaj,
    userId: userId ?? "",
    transactionId,
    tip,
  };
  if (tip === "data_plan" && bundleId != null) {
    invokeBody.bundleId = bundleId;
  }

  let invokeText = "";
  try {
    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(invokeBody),
    });
    invokeText = await res.text();
    let j: { success?: boolean; error?: string } = {};
    try {
      j = JSON.parse(invokeText) as { success?: boolean; error?: string };
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      await svc
        .from("tranzaksyon")
        .update({
          estati: "echwe",
          mesaj_estati: (j.error || invokeText).slice(0, 2000),
        })
        .eq("id", transactionId);
      return {
        ok: false,
        error: j.error || `Reloadly / voye-recharge: ${res.status}`,
        status: res.status >= 400 && res.status < 600 ? res.status : 502,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await svc
      .from("tranzaksyon")
      .update({ estati: "echwe", mesaj_estati: msg.slice(0, 2000) })
      .eq("id", transactionId);
    return { ok: false, error: `Rezo / voye-recharge: ${msg}`, status: 502 };
  }

  const { data: row, error: selErr } = await svc
    .from("tranzaksyon")
    .select("id, estati, created_at, reloadly_transaction_id, mesaj_estati")
    .eq("id", transactionId)
    .maybeSingle();

  if (selErr || !row) {
    return { ok: false, error: "Pa ka verifye tranzaksyon apre voye", status: 500 };
  }

  if (String(row.estati) !== "siksè") {
    return {
      ok: false,
      error:
        String(row.mesaj_estati || "").trim() ||
        `Reloadly pa konfime siksè (estati: ${String(row.estati)}). Eseye ankò oswa verifye nimewo a.`,
      status: 502,
    };
  }

  const reference = genRefFromUuid(transactionId);
  const costRatio = parseFloat(process.env.RELOADLY_COST_RATIO || "0.92");
  const costUsd = Math.round(prixKoutaj * costRatio * 100) / 100;

  const fxLocal =
    channelRecord.amount_usd > 0 ? channelRecord.amount_local / channelRecord.amount_usd : 1;
  const record: RechargeRecord = {
    ...channelRecord,
    id: transactionId,
    reference,
    status: "siksè",
    created_at: String(row.created_at || inserted.created_at || new Date().toISOString()),
    mock: false,
    cost_usd: costUsd,
    amount_usd: prixVann,
    amount_local: Math.round(prixVann * fxLocal),
  };

  return { ok: true, record };
}

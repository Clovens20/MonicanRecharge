import { getDb } from "@/lib/mongodb";
import { applyAgentCommission } from "@/lib/ajan/commission";
import { notifyRechargeSuccess } from "@/lib/notify/resend-notifications";
import { buildRechargeFromBody, type RechargeBody, type RechargeRecord } from "@/lib/recharge/executeSend";
import { getGlobalMarkupConfig } from "@/lib/admin/markup-settings";

export type FailedTxDoc = {
  id: string;
  reference?: string;
  created_at?: string;
  status?: string;
  retry_count?: number;
  retry_payload?: RechargeBody;
  ajan_kod?: string | null;
};

/** Re-eseye yon tranzaksyon `echwe` ki gen `retry_payload` (sere nan Mongo lè API Reloadly echwe). */
export async function attemptReloadlyRetry(doc: FailedTxDoc): Promise<{ ok: boolean; error?: string }> {
  if (!doc.retry_payload) return { ok: false, error: "missing retry_payload" };
  const ref = doc.ajan_kod ?? null;
  const markup = await getGlobalMarkupConfig();
  const built = buildRechargeFromBody(doc.retry_payload, ref, markup);
  if (!built.ok) return { ok: false, error: built.error };

  const db = await getDb();
  if (!db) return { ok: false, error: "no mongo" };

  const next: RechargeRecord = {
    ...built.record,
    id: doc.id,
    reference: doc.reference || built.record.reference,
    created_at: doc.created_at || built.record.created_at,
    status: "siksè",
    retry_count: (doc.retry_count || 0) + 1,
  };

  const r = await db.collection("tranzaksyon").replaceOne({ id: doc.id }, next as Record<string, unknown>);
  if (r.matchedCount === 0) return { ok: false, error: "not found" };

  const com = await applyAgentCommission({
    refKod: ref,
    tranzaksyonRef: next.reference,
    montantVannUsd: built.finalAmount,
  });
  if (!com.ok) console.warn("commission retry:", com.error);
  await notifyRechargeSuccess(next);
  return { ok: true };
}

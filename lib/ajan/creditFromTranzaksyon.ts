import { getServiceSupabase } from "@/lib/supabase/service";
import { applyAgentCommission } from "@/lib/ajan/commission";

/** Aprè recharge Reloadly reyisi (webhook oswa voye-recharge), kredite ajan depi `tranzaksyon`. */
export async function creditAgentCommissionFromTranzaksyonId(transactionId: string): Promise<void> {
  const svc = getServiceSupabase();
  if (!svc) return;
  const { data: row, error } = await svc
    .from("tranzaksyon")
    .select("ref_kòd, montant_usd")
    .eq("id", transactionId)
    .maybeSingle();
  if (error || !row) return;
  const ref = row.ref_kòd ? String(row.ref_kòd).trim() : "";
  if (!ref) return;
  const amount = Number(row.montant_usd);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const com = await applyAgentCommission({
    refKod: ref,
    tranzaksyonRef: transactionId,
    montantVannUsd: amount,
  });
  if (!com.ok) console.warn("[creditFromTranzaksyon]", com.error);
}

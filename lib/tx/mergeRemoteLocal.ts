import type { TxLocal } from "@/lib/store";

/** Fusionne les lignes Supabase (`tranzaksyon`) avec le localStorage (caisse / ancien flux), sans doublon `id`. */
export function mergeRemoteAndLocalTx(remote: TxLocal[], local: TxLocal[]): TxLocal[] {
  const m = new Map<string, TxLocal>();
  for (const r of remote) m.set(r.id, r);
  for (const l of local) {
    if (!m.has(l.id)) m.set(l.id, l);
  }
  return Array.from(m.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

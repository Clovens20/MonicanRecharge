import { getServiceSupabase } from "@/lib/supabase/service";
import type { TxDoc } from "@/lib/admin/mongo-stats";

type TranzRow = {
  id: string;
  created_at: string;
  operatè: string | null;
  pays_kòd: string | null;
  nimewo_resevwa: string | null;
  montant_usd: number | string | null;
  pri_koutaj: number | string | null;
  mòd_peman: string | null;
  estati: string | null;
  reloadly_transaction_id: string | null;
};

function mapRow(row: TranzRow): TxDoc {
  const id = String(row.id);
  const cc = String(row.pays_kòd || "HT").toUpperCase().slice(0, 2);
  const raw = String(row.nimewo_resevwa || "").replace(/\D/g, "");
  const dial = cc === "HT" ? "+509" : "+1";
  const recipient = raw ? `${dial} ${raw}` : "—";
  const gross = Number(row.montant_usd ?? row.pri_koutaj ?? 0);
  const cost = Number(row.pri_koutaj ?? row.montant_usd ?? 0);
  const ref = row.reloadly_transaction_id
    ? `RL-${row.reloadly_transaction_id}`
    : `TX-${id.replace(/-/g, "").slice(0, 12)}`;
  return {
    id,
    reference: ref,
    created_at: row.created_at,
    channel: String(row.mòd_peman || "—"),
    recipient,
    operator: String(row.operatè || "—"),
    amount_usd: Number.isFinite(gross) ? gross : 0,
    cost_usd: Number.isFinite(cost) ? cost : 0,
    status: String(row.estati || "—"),
    payment_method: String(row.mòd_peman || "—"),
  };
}

/** Liste admin : tranzaksyon depi Supabase (Stripe, cash/Reloadly, elatriye). */
export async function fetchSupabaseTransactionsFiltered(q: {
  from?: string;
  to?: string;
  channel?: string;
  operator?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<TxDoc[]> {
  const svc = getServiceSupabase();
  if (!svc) return [];

  const lim = Math.min(q.limit || 200, 500);
  let query = svc.from("tranzaksyon").select("*").order("created_at", { ascending: false });

  if (q.from) query = query.gte("created_at", q.from);
  if (q.to) query = query.lte("created_at", q.to);
  if (q.operator?.trim()) query = query.ilike("operatè", `%${q.operator.trim().replace(/%/g, "")}%`);
  if (q.status?.trim()) query = query.ilike("estati", q.status.trim().replace(/%/g, ""));
  if (q.channel?.trim()) query = query.ilike("mòd_peman", `%${q.channel.trim().replace(/%/g, "")}%`);

  const s = (q.search || "").trim().replace(/%/g, "").replace(/,/g, " ").slice(0, 120);
  if (s.length > 0) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(s)) {
      query = query.or(`id.eq.${s},nimewo_resevwa.ilike.%${s}%,operatè.ilike.%${s}%,reloadly_transaction_id.ilike.%${s}%`);
    } else {
      query = query.or(`nimewo_resevwa.ilike.%${s}%,operatè.ilike.%${s}%,reloadly_transaction_id.ilike.%${s}%`);
    }
  }

  query = query.limit(lim);

  const { data, error } = await query;
  if (error) {
    console.warn("fetchSupabaseTransactionsFiltered:", error.message);
    return [];
  }
  return (data || []).map((r) => mapRow(r as TranzRow));
}

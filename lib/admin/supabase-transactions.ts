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

type TopupRow = {
  id: string;
  created_at: string;
  montant_usd: number | string | null;
  stripe_session_id: string | null;
  ajan_id: string;
};

function mapTopupRow(row: TopupRow): TxDoc {
  const gross = Number(row.montant_usd ?? 0);
  const sid = String(row.stripe_session_id || "");
  return {
    id: String(row.id),
    reference: sid ? `AT-${sid.slice(-18)}` : `AT-${String(row.id).replace(/-/g, "").slice(0, 12)}`,
    created_at: row.created_at,
    channel: "stripe_agent_topup",
    recipient: `Ajan ${String(row.ajan_id).replace(/-/g, "").slice(0, 8)}…`,
    operator: "Top-up solde komisyon (kart)",
    amount_usd: Number.isFinite(gross) ? gross : 0,
    cost_usd: Number.isFinite(gross) ? gross : 0,
    status: "kredi",
    payment_method: "stripe_agent_topup",
  };
}

function agentTopupChannelVisible(channelFilter?: string): boolean {
  const c = (channelFilter || "").trim().toLowerCase();
  if (!c) return true;
  if (c.includes("agent")) return true;
  if (c.includes("topup")) return true;
  if (c.includes("stripe_agent")) return true;
  return false;
}

/** Top-ups agent (Stripe) — pa nan tab `tranzaksyon`, men dwe parèt nan lis admin. */
export async function fetchAjanTopupCardTransactionsFiltered(q: {
  from?: string;
  to?: string;
  channel?: string;
  operator?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<TxDoc[]> {
  if (!agentTopupChannelVisible(q.channel)) return [];

  const st = (q.status || "").trim().toLowerCase();
  if (st && !st.includes("kredi")) return [];

  const op = (q.operator || "").trim();
  if (op) return [];

  const svc = getServiceSupabase();
  if (!svc) return [];

  const lim = Math.min(q.limit || 200, 500);
  let query = svc
    .from("ajan_topup_card")
    .select("id, created_at, montant_usd, stripe_session_id, ajan_id")
    .order("created_at", { ascending: false });

  if (q.from) query = query.gte("created_at", q.from);
  if (q.to) query = query.lte("created_at", q.to);

  const s = (q.search || "").trim().replace(/%/g, "").replace(/,/g, " ").slice(0, 120);
  if (s.length > 0) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRe.test(s)) {
      query = query.or(`id.eq.${s},ajan_id.eq.${s}`);
    } else if (/^cs_/i.test(s)) {
      query = query.ilike("stripe_session_id", `%${s}%`);
    } else {
      return [];
    }
  }

  query = query.limit(lim);

  const { data, error } = await query;
  if (error) {
    console.warn("fetchAjanTopupCardTransactionsFiltered:", error.message);
    return [];
  }
  return (data || []).map((r) => mapTopupRow(r as TopupRow));
}

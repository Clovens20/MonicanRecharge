import { getDb } from "@/lib/mongodb";

export type TxDoc = {
  id?: string;
  reference?: string;
  amount_usd?: number;
  cost_usd?: number;
  created_at?: string;
  operator?: string;
  payment_method?: string;
  channel?: string;
  status?: string;
  recipient?: string;
  user_email?: string | null;
  refunded?: boolean;
  retry_count?: number;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export async function fetchRecentTransactions(limit = 50): Promise<TxDoc[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .collection("tranzaksyon")
    .find({})
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return rows as TxDoc[];
}

export async function fetchTransactionsFiltered(q: {
  from?: string;
  to?: string;
  channel?: string;
  operator?: string;
  status?: string;
  search?: string;
  limit?: number;
}): Promise<TxDoc[]> {
  const db = await getDb();
  if (!db) return [];
  const filter: Record<string, unknown> = {};
  if (q.from || q.to) {
    filter.created_at = {};
    if (q.from) (filter.created_at as Record<string, string>).$gte = q.from;
    if (q.to) (filter.created_at as Record<string, string>).$lte = q.to;
  }
  if (q.channel) filter.channel = q.channel;
  if (q.operator) filter.operator = { $regex: q.operator, $options: "i" };
  if (q.status) filter.status = q.status;
  if (q.search) {
    filter.$or = [
      { recipient: { $regex: q.search, $options: "i" } },
      { reference: { $regex: q.search, $options: "i" } },
      { user_email: { $regex: q.search, $options: "i" } },
      { id: { $regex: q.search, $options: "i" } },
    ];
  }
  const lim = Math.min(q.limit || 200, 500);
  const rows = await db.collection("tranzaksyon").find(filter).sort({ created_at: -1 }).limit(lim).toArray();
  return rows as TxDoc[];
}

export async function todayStats(): Promise<{ rev: number; count: number }> {
  const db = await getDb();
  if (!db) return { rev: 0, count: 0 };
  const since = startOfDay(new Date());
  const agg = await db
    .collection("tranzaksyon")
    .aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: null, rev: { $sum: "$amount_usd" }, count: { $sum: 1 } } },
    ])
    .toArray();
  const a = agg[0] as { rev?: number; count?: number } | undefined;
  return { rev: Number(a?.rev || 0), count: Number(a?.count || 0) };
}

export async function activeCustomersApprox(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const since = daysAgo(30);
  const n = await db.collection("tranzaksyon").distinct("user_email", {
    user_email: { $nin: [null, ""] },
    created_at: { $gte: since },
  });
  return n.length;
}

export async function chartSeries(): Promise<{
  last7d: { day: string; revenue: number }[];
  byOperator: { name: string; value: number }[];
  byChannel: { name: string; revenue: number }[];
  hourly: { h: number; n: number }[];
}> {
  const db = await getDb();
  const empty = {
    last7d: [] as { day: string; revenue: number }[],
    byOperator: [] as { name: string; value: number }[],
    byChannel: [] as { name: string; revenue: number }[],
    hourly: Array.from({ length: 24 }, (_, h) => ({ h, n: 0 })),
  };
  if (!db) return empty;

  const since = daysAgo(7);
  const txs = (await db
    .collection("tranzaksyon")
    .find({ created_at: { $gte: since } })
    .toArray()) as TxDoc[];

  const dayMap: Record<string, number> = {};
  const opMap: Record<string, number> = {};
  const chMap: Record<string, number> = {};
  const hourCount = Array.from({ length: 24 }, () => 0);

  const today = startOfDay(new Date());
  for (const t of txs) {
    const amt = Number(t.amount_usd || 0);
    const d = (t.created_at || "").slice(0, 10);
    dayMap[d] = (dayMap[d] || 0) + amt;
    const op = t.operator || "?";
    opMap[op] = (opMap[op] || 0) + 1;
    const ch = t.channel || (t.payment_method === "moncash" ? "moncash_manual" : "online");
    chMap[ch] = (chMap[ch] || 0) + amt;
    if (t.created_at && t.created_at >= today) {
      const hr = new Date(t.created_at).getHours();
      hourCount[hr] += 1;
    }
  }

  const last7d = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, revenue]) => ({ day, revenue }));
  const byOperator = Object.entries(opMap).map(([name, value]) => ({ name, value }));
  const byChannel = Object.entries(chMap).map(([name, revenue]) => ({ name, revenue }));
  const hourly = hourCount.map((n, h) => ({ h, n }));

  return { last7d, byOperator, byChannel, hourly };
}

export async function plReport(range: "day" | "week" | "month"): Promise<{
  gross: number;
  costs: number;
  net: number;
  commissionAgents: number;
}> {
  const db = await getDb();
  const z = { gross: 0, costs: 0, net: 0, commissionAgents: 0 };
  if (!db) return z;
  let since = daysAgo(1);
  if (range === "week") since = daysAgo(7);
  if (range === "month") since = daysAgo(30);
  const txs = (await db.collection("tranzaksyon").find({ created_at: { $gte: since } }).toArray()) as TxDoc[];
  let gross = 0;
  let costs = 0;
  for (const t of txs) {
    gross += Number(t.amount_usd || 0);
    costs += Number(t.cost_usd ?? t.amount_usd * 0.92);
  }
  const svcCommission = 0;
  return {
    gross,
    costs,
    net: gross - costs,
    commissionAgents: svcCommission,
  };
}

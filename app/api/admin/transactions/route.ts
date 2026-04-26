import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { fetchTransactionsFiltered } from "@/lib/admin/mongo-stats";

export async function GET(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rows = await fetchTransactionsFiltered({
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    channel: searchParams.get("channel") || undefined,
    operator: searchParams.get("operator") || undefined,
    status: searchParams.get("status") || undefined,
    search: searchParams.get("q") || undefined,
    limit: parseInt(searchParams.get("limit") || "200", 10),
  });

  const enriched = rows.map((r) => {
    const gross = Number(r.amount_usd || 0);
    const cost = Number(r.cost_usd ?? gross * 0.92);
    return {
      ...r,
      profit: Math.round((gross - cost) * 100) / 100,
      channel: r.channel || (r.payment_method === "moncash" ? "moncash_manual" : "online"),
    };
  });

  return NextResponse.json({ transactions: enriched });
}

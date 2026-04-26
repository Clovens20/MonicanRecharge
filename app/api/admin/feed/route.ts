import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { fetchRecentTransactions } from "@/lib/admin/mongo-stats";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await fetchRecentTransactions(40);
  const feed = rows.map((r) => ({
    line: `${r.recipient || "?"} ← $${r.amount_usd} ${r.operator || ""} ${r.status === "siksè" ? "✅" : "·"}`,
    ago: r.created_at || "",
    ref: r.reference,
  }));
  return NextResponse.json({ feed });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { chartSeries } from "@/lib/admin/mongo-stats";

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
  const charts = await chartSeries();
  return NextResponse.json(charts);
}

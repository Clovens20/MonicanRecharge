import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { rebateUsdFromPoints } from "@/lib/loyalty/points";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ pwen_total: 0, pwen_itilize: 0, rebate_usd: 0 });

  const { data } = await svc.from("pwen_fidelite").select("pwen_total,pwen_itilize").eq("user_id", user.id).maybeSingle();
  const total = Number(data?.pwen_total || 0);
  const itilize = Number(data?.pwen_itilize || 0);
  return NextResponse.json({
    pwen_total: total,
    pwen_itilize: itilize,
    rebate_usd: rebateUsdFromPoints(total, itilize),
  });
}

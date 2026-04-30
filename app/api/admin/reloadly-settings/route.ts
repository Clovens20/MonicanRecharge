import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { getReloadlyLastRechargeAt, getReloadlyMinAlertUsd } from "@/lib/admin/reloadly-settings";
import { getReloadlyBalanceUsdForAdmin } from "@/lib/reloadly/adminBalance";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { balanceUsd, source, liveError } = await getReloadlyBalanceUsdForAdmin();
  const minAlert = await getReloadlyMinAlertUsd();
  const lastRecharge = await getReloadlyLastRechargeAt();
  const low = balanceUsd < minAlert;

  return NextResponse.json({
    balance: balanceUsd,
    balanceSource: source,
    liveError: liveError ?? null,
    minAlert,
    low,
    lastRecharge,
    reloadlyUrl: "https://www.reloadly.com",
  });
}

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  let body: { minAlert?: number; markDernyeRecharge?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }

  if (body.minAlert != null && Number.isFinite(body.minAlert) && body.minAlert > 0) {
    const { error } = await svc.from("admin_settings").upsert(
      { kle: "reloadly_min_alert_usd", valè: { v: body.minAlert } },
      { onConflict: "kle" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.markDernyeRecharge) {
    const { error } = await svc.from("admin_settings").upsert(
      { kle: "reloadly_dernye_recharge", valè: { at: new Date().toISOString() } },
      { onConflict: "kle" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

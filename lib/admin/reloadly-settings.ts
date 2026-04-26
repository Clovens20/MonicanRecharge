import { getServiceSupabase } from "@/lib/supabase/service";

export async function getReloadlyMinAlertUsd(): Promise<number> {
  const svc = getServiceSupabase();
  if (!svc) return parseFloat(process.env.RELOADLY_MIN_ALERT_USD || "50");
  const { data } = await svc.from("admin_settings").select("valè").eq("kle", "reloadly_min_alert_usd").maybeSingle();
  const v = (data?.valè as { v?: number } | null)?.v;
  if (v != null && Number.isFinite(Number(v))) return Number(v);
  return parseFloat(process.env.RELOADLY_MIN_ALERT_USD || "50");
}

export async function getReloadlyLastRechargeAt(): Promise<string | null> {
  const svc = getServiceSupabase();
  if (!svc) return null;
  const { data } = await svc.from("admin_settings").select("valè").eq("kle", "reloadly_dernye_recharge").maybeSingle();
  const at = (data?.valè as { at?: string } | null)?.at;
  return at && typeof at === "string" ? at : null;
}

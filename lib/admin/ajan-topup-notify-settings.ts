import type { SupabaseClient } from "@supabase/supabase-js";

const KLE = "ajan_topup_notify_admin";

export type AjanTopupNotifyValè = { on?: boolean };

export async function getAjanTopupNotifyAdminOn(svc: SupabaseClient): Promise<boolean> {
  const { data } = await svc.from("admin_settings").select("valè").eq("kle", KLE).maybeSingle();
  const v = (data?.valè || {}) as AjanTopupNotifyValè;
  return Boolean(v.on);
}

export async function setAjanTopupNotifyAdminOn(
  svc: SupabaseClient,
  on: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await svc.from("admin_settings").upsert({ kle: KLE, valè: { on } }, { onConflict: "kle" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

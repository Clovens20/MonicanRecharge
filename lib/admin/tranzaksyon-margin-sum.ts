import type { SupabaseClient } from "@supabase/supabase-js";

/** Sòm (pri_vann - pri_koutaj) sou tranzaksyon siksè depi `sinceIso` (max 8000 liy). */
export async function sumGrossMarginUsdSince(svc: SupabaseClient, sinceIso: string): Promise<number> {
  const { data, error } = await svc
    .from("tranzaksyon")
    .select("pri_vann,pri_koutaj")
    .eq("estati", "siksè")
    .gte("created_at", sinceIso)
    .limit(8000);
  if (error || !data?.length) return 0;
  let t = 0;
  for (const row of data) {
    const v = Number(row.pri_vann);
    const k = Number(row.pri_koutaj);
    if (Number.isFinite(v) && Number.isFinite(k)) t += v - k;
  }
  return Math.round(t * 100) / 100;
}

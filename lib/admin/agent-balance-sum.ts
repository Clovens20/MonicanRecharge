import type { SupabaseClient } from "@supabase/supabase-js";

/** Sòm `balans_komisyon` tout ajan aktif (komisyon + prepaid kart, etc.) — endikatè ekspozisyon biznis. */
export async function sumActiveAgentBalansKomisyonUsd(svc: SupabaseClient): Promise<number> {
  const { data, error } = await svc.from("ajan").select("balans_komisyon").eq("estati", "aktif");
  if (error || !data?.length) return 0;
  let s = 0;
  for (const r of data) {
    s += Number((r as { balans_komisyon?: unknown }).balans_komisyon || 0);
  }
  return Math.round(s * 100) / 100;
}

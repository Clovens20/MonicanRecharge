import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { MarkupConfig } from "@/lib/markup";
import { DEFAULT_MARKUP_CONFIG, normalizeMarkupConfig } from "@/lib/markup";

export const ADMIN_MARKUP_SETTINGS_KLE = "global_markup";

type StoredValè = {
  enabled?: boolean;
  percentage?: number;
  minFlatFee?: number;
  updated_at?: string;
};

export function rowValèToMarkupConfig(valè: unknown): MarkupConfig {
  if (!valè || typeof valè !== "object") return { ...DEFAULT_MARKUP_CONFIG };
  return normalizeMarkupConfig(valè as StoredValè);
}

export function markupConfigToValè(cfg: MarkupConfig): StoredValè {
  return {
    enabled: cfg.enabled,
    percentage: cfg.percentage,
    minFlatFee: cfg.minFlatFee,
    updated_at: new Date().toISOString(),
  };
}

export async function getGlobalMarkupConfig(): Promise<MarkupConfig> {
  const svc = getServiceSupabase();
  if (!svc) return { ...DEFAULT_MARKUP_CONFIG };
  const { data } = await svc.from("admin_settings").select("valè").eq("kle", ADMIN_MARKUP_SETTINGS_KLE).maybeSingle();
  const raw = (data as { valè?: unknown } | null)?.valè;
  return rowValèToMarkupConfig(raw);
}

export async function setGlobalMarkupConfig(
  svc: SupabaseClient,
  cfg: MarkupConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const valè = markupConfigToValè(cfg);
  const { error } = await svc.from("admin_settings").upsert(
    { kle: ADMIN_MARKUP_SETTINGS_KLE, valè },
    { onConflict: "kle" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

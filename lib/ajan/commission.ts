import { getServiceSupabase } from "@/lib/supabase/service";

/** Akimile komisyon ajan aprè yon vann (Supabase). */
export async function applyAgentCommission(params: {
  refKod: string | null | undefined;
  tranzaksyonRef: string;
  montantVannUsd: number;
}): Promise<{ ok: boolean; error?: string }> {
  const ref = (params.refKod || "").trim().replace(/[^A-Za-z0-9\-_]/g, "");
  if (ref.length < 4) return { ok: true };

  const svc = getServiceSupabase();
  if (!svc) return { ok: true };

  const { data: ag, error: e1 } = await svc
    .from("ajan")
    .select("user_id,to_komisyon,balans_komisyon,total_tranzaksyon,total_komisyon_ganye,estati")
    .eq("kòd_ajan", ref)
    .maybeSingle();

  if (e1 || !ag || ag.estati !== "aktif") return { ok: true };

  const pct = Number(ag.to_komisyon || 0);
  if (!Number.isFinite(pct) || pct <= 0) return { ok: true };

  const kom = Math.round(params.montantVannUsd * (pct / 100) * 100) / 100;

  const { error: e2 } = await svc.from("komisyon_tranzaksyon").insert({
    ajan_id: ag.user_id,
    tranzaksyon_ref: params.tranzaksyonRef,
    montant_vann_usd: params.montantVannUsd,
    pousantaj: pct,
    montant_komisyon: kom,
    estati: "annatant",
  });

  if (e2) {
    if (String(e2.message).includes("duplicate") || String(e2.code) === "23505") {
      return { ok: true };
    }
    return { ok: false, error: e2.message };
  }

  const bal = Number(ag.balans_komisyon || 0) + kom;
  const txc = Number(ag.total_tranzaksyon || 0) + 1;
  const tot = Number(ag.total_komisyon_ganye || 0) + kom;

  const { error: e3 } = await svc
    .from("ajan")
    .update({
      balans_komisyon: bal,
      total_tranzaksyon: txc,
      total_komisyon_ganye: tot,
    })
    .eq("user_id", ag.user_id);

  if (e3) return { ok: false, error: e3.message };
  return { ok: true };
}

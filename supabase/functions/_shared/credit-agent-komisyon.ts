/** Même logique que `lib/ajan/commission.ts` — kredite ajan aprè tranzaksyon Stripe/Reloadly reyisi. */
// deno-lint-ignore no-explicit-any
export async function creditAgentKomisyonFromTxId(supabase: any, transactionId: string): Promise<void> {
  const { data: row, error: e0 } = await supabase
    .from("tranzaksyon")
    .select("ref_kòd, montant_usd")
    .eq("id", transactionId)
    .maybeSingle();
  if (e0 || !row) return;
  const ref = row.ref_kòd ? String(row.ref_kòd).trim().replace(/[^A-Za-z0-9\-_]/g, "") : "";
  if (ref.length < 4) return;
  const montantVannUsd = Number(row.montant_usd);
  if (!Number.isFinite(montantVannUsd) || montantVannUsd <= 0) return;

  const { data: ag, error: e1 } = await supabase
    .from("ajan")
    .select("user_id,to_komisyon,balans_komisyon,total_tranzaksyon,total_komisyon_ganye,estati")
    .eq("kòd_ajan", ref)
    .maybeSingle();
  if (e1 || !ag || ag.estati !== "aktif") return;

  const pct = Number(ag.to_komisyon || 0);
  if (!Number.isFinite(pct) || pct <= 0) return;
  const kom = Math.round(montantVannUsd * (pct / 100) * 100) / 100;

  const { error: e2 } = await supabase.from("komisyon_tranzaksyon").insert({
    ajan_id: ag.user_id,
    tranzaksyon_ref: transactionId,
    montant_vann_usd: montantVannUsd,
    pousantaj: pct,
    montant_komisyon: kom,
    estati: "annatant",
  });
  if (e2) {
    if (String(e2.message).includes("duplicate") || String(e2.code) === "23505") return;
    console.warn("credit-agent-komisyon insert:", e2.message);
    return;
  }

  const bal = Number(ag.balans_komisyon || 0) + kom;
  const txc = Number(ag.total_tranzaksyon || 0) + 1;
  const tot = Number(ag.total_komisyon_ganye || 0) + kom;

  const { error: e3 } = await supabase
    .from("ajan")
    .update({
      balans_komisyon: bal,
      total_tranzaksyon: txc,
      total_komisyon_ganye: tot,
    })
    .eq("user_id", ag.user_id);
  if (e3) console.warn("credit-agent-komisyon update ajan:", e3.message);
}

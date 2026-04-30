import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_MANUAL = 25_000;

export type ManualKomisyonResult =
  | { ok: true; newBalans: number }
  | { ok: false; error: string; status: number };

/**
 * Ajoute USD nan `balans_komisyon` + liy `komisyon_tranzaksyon` (kòrèksyon admin).
 * Pa touche `total_tranzaksyon` (kontè vann otomatik).
 */
export async function applyManualKomisyonCredit(
  svc: SupabaseClient,
  params: {
    ajanUserId: string;
    montant: number;
    nòt?: string | null;
    tranzaksyonId?: string | null;
  }
): Promise<ManualKomisyonResult> {
  const montant = Number(params.montant);
  if (!Number.isFinite(montant) || montant <= 0 || montant > MAX_MANUAL) {
    return { ok: false, error: `Montant 0.01–${MAX_MANUAL} USD`, status: 400 };
  }

  const nòtTrim = (params.nòt || "").trim();
  if (nòtTrim.length < 4) {
    return { ok: false, error: "Nòt obligatwa (min 4 karaktè) pou audit", status: 400 };
  }

  const { data: ag, error: e1 } = await svc
    .from("ajan")
    .select("user_id,balans_komisyon,total_komisyon_ganye,estati")
    .eq("user_id", params.ajanUserId)
    .maybeSingle();
  if (e1 || !ag) return { ok: false, error: "Ajan pa jwenn", status: 404 };
  if (ag.estati !== "aktif") return { ok: false, error: "Ajan pa aktif", status: 400 };

  let tranzaksyonRef: string;
  let montantVannUsd = 0;
  let pousantaj = 0;

  if (params.tranzaksyonId?.trim()) {
    const tid = params.tranzaksyonId.trim();
    const { data: tx, error: eTx } = await svc
      .from("tranzaksyon")
      .select("id,user_id,ajan_id,estati,montant_usd")
      .eq("id", tid)
      .maybeSingle();
    if (eTx || !tx) return { ok: false, error: "Tranzaksyon pa jwenn", status: 404 };
    const uid = params.ajanUserId;
    const linked = tx.user_id === uid || tx.ajan_id === uid;
    if (!linked) {
      return { ok: false, error: "Tranzaksyon sa a pa lyé ak ajan sa a", status: 400 };
    }
    if (String(tx.estati) !== "siksè") {
      return { ok: false, error: "Tranzaksyon dwe nan estati siksè", status: 400 };
    }
    const { data: dup } = await svc
      .from("komisyon_tranzaksyon")
      .select("id")
      .eq("ajan_id", uid)
      .eq("tranzaksyon_ref", tid)
      .maybeSingle();
    if (dup) {
      return { ok: false, error: "Komisyon deja anrejistre pou tranzaksyon sa a", status: 409 };
    }
    tranzaksyonRef = tid;
    montantVannUsd = Number(tx.montant_usd) || 0;
    if (montantVannUsd > 0) {
      pousantaj = Math.round((montant / montantVannUsd) * 10_000) / 100;
    }
  } else {
    tranzaksyonRef = `ADMIN-${crypto.randomUUID()}`;
  }

  const nòt = nòtTrim.slice(0, 2000);

  const { error: e2 } = await svc.from("komisyon_tranzaksyon").insert({
    ajan_id: params.ajanUserId,
    tranzaksyon_ref: tranzaksyonRef,
    montant_vann_usd: montantVannUsd,
    pousantaj,
    montant_komisyon: montant,
    estati: "annatant",
    nòt_admin: nòt,
  });
  if (e2) {
    if (String(e2.message).includes("duplicate") || String(e2.code) === "23505") {
      return { ok: false, error: "Doublon (tranzaksyon_ref)", status: 409 };
    }
    return { ok: false, error: e2.message, status: 500 };
  }

  const newBal = Number(ag.balans_komisyon || 0) + montant;
  const newTot = Number(ag.total_komisyon_ganye || 0) + montant;

  const { error: e3 } = await svc
    .from("ajan")
    .update({
      balans_komisyon: newBal,
      total_komisyon_ganye: newTot,
    })
    .eq("user_id", params.ajanUserId);
  if (e3) {
    await svc.from("komisyon_tranzaksyon").delete().eq("ajan_id", params.ajanUserId).eq("tranzaksyon_ref", tranzaksyonRef);
    return { ok: false, error: e3.message, status: 500 };
  }

  return { ok: true, newBalans: newBal };
}

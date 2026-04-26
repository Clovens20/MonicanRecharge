import { randomBytes } from "crypto";
import { getServiceSupabase } from "@/lib/supabase/service";

export function generateReferralKod(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function ensureReferralKod(userId: string): Promise<string | null> {
  const svc = getServiceSupabase();
  if (!svc) return null;
  const { data: ex } = await svc.from("referal_kod").select("kod").eq("user_id", userId).maybeSingle();
  if (ex?.kod) return ex.kod as string;
  for (let i = 0; i < 5; i++) {
    const kod = generateReferralKod();
    const { error } = await svc.from("referal_kod").insert({ user_id: userId, kod });
    if (!error) return kod;
  }
  return null;
}

export async function incrementKredi(userId: string, deltaUsd: number) {
  const svc = getServiceSupabase();
  if (!svc) return;
  const { data } = await svc.from("referal_kredi").select("balans_usd").eq("user_id", userId).maybeSingle();
  const b = Number(data?.balans_usd || 0) + deltaUsd;
  await svc
    .from("referal_kredi")
    .upsert({ user_id: userId, balans_usd: b, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

/** Premye tranzaksyon siksè: $1 pou referrer ak referee (yon sèl fwa). */
export async function maybeGrantReferralFirstBonus(refereeUserId: string | null) {
  if (!refereeUserId) return;
  const svc = getServiceSupabase();
  if (!svc) return;

  const { data: done } = await svc.from("referal_bonus_done").select("referee_user_id").eq("referee_user_id", refereeUserId).maybeSingle();
  if (done) return;

  const { data: attr } = await svc
    .from("referal_atribisyon")
    .select("referrer_user_id")
    .eq("referee_user_id", refereeUserId)
    .maybeSingle();
  if (!attr?.referrer_user_id || attr.referrer_user_id === refereeUserId) return;

  const referrerId = attr.referrer_user_id as string;

  const { error: e1 } = await svc.from("referal_bonus_done").insert({ referee_user_id: refereeUserId });
  if (e1) return;

  await incrementKredi(referrerId, 1);
  await incrementKredi(refereeUserId, 1);
}

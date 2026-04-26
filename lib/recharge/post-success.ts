import { getServiceSupabase } from "@/lib/supabase/service";
import { pointsFromUsd } from "@/lib/loyalty/points";
import { maybeGrantReferralFirstBonus } from "@/lib/referal/customer";
import type { RechargeRecord } from "@/lib/recharge/executeSend";
import { sendHtmlEmail } from "@/lib/notify/resend-notifications";

export async function runAfterSuccessfulRecharge(params: {
  userId: string | null;
  record: RechargeRecord;
  finalAmountUsd: number;
  context?: "normal" | "otomatik";
}) {
  const svc = getServiceSupabase();
  if (!svc || !params.userId) return;

  const pts = pointsFromUsd(params.finalAmountUsd);
  if (pts > 0) {
    const { data: row } = await svc.from("pwen_fidelite").select("pwen_total,pwen_itilize").eq("user_id", params.userId).maybeSingle();
    const cur = Number(row?.pwen_total || 0);
    await svc.from("pwen_fidelite").upsert(
      {
        user_id: params.userId,
        pwen_total: cur + pts,
        pwen_itilize: Number(row?.pwen_itilize || 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  await maybeGrantReferralFirstBonus(params.userId);

  if (params.context === "otomatik" && params.record.user_email) {
    await sendHtmlEmail({
      to: params.record.user_email,
      subject: "⏰ Recharge otomatik voye! ✅",
      html: `<p>Recharge otomatik voye!</p>
        <p>${params.record.recipient} — ${params.finalAmountUsd} USD — ${params.record.reference}</p>
        <p>Mèsi — Monican Recharge</p>`,
    });
  }
}

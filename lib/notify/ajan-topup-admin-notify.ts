import { getServiceSupabase } from "@/lib/supabase/service";
import { getAjanTopupNotifyAdminOn } from "@/lib/admin/ajan-topup-notify-settings";
import { sendAdminEmail } from "@/lib/notify/resend-notifications";

/** Imèl admin (si opsyon an aktive) aprè acha kredi marchand Stripe yon ajan. */
export async function notifyAdminsAjanTopupPurchase(params: {
  ajanUserId: string;
  amountUsd: number;
  stripeSessionId: string;
  agentCode?: string | null;
}): Promise<void> {
  const svc = getServiceSupabase();
  if (!svc) return;
  const on = await getAjanTopupNotifyAdminOn(svc);
  if (!on) return;
  const code = (params.agentCode || "").trim() || params.ajanUserId.replace(/-/g, "").slice(0, 10);
  await sendAdminEmail(
    `Monican — top-up ajan $${params.amountUsd.toFixed(2)}`,
    `<p>Yon ajan revandè fè yon acha <strong>kredi marchand</strong> (Stripe).</p>
<ul>
<li><strong>Montan</strong> : $${params.amountUsd.toFixed(2)} USD</li>
<li><strong>Ajan</strong> : <code>${escapeHtml(code)}</code> (${escapeHtml(params.ajanUserId)})</li>
<li><strong>Stripe session</strong> : <code>${escapeHtml(params.stripeSessionId)}</code></li>
</ul>
<p><a href="https://dashboard.stripe.com">Stripe Dashboard →</a></p>`,
  );
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

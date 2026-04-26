/** Notifications imèl (Resend). */
import type { RechargeRecord } from "@/lib/recharge/executeSend";
import { sendWhatsAppIfConfigured } from "@/lib/notify/twilio-whatsapp";

function maskRecipient(recipient: string) {
  return recipient.replace(/(\+\d{1,3})\s?(\d{2})\d+(\d{2})/, "$1 $2…$3");
}

export async function notifyRechargeSuccess(record: RechargeRecord) {
  const recipientMasked = maskRecipient(record.recipient);
  await sendRechargeConfirmationEmail({
    to: record.user_email,
    reference: record.reference,
    amountUsd: record.amount_usd,
    operator: record.operator,
    recipientMasked,
  });
  const waTo = process.env.TWILIO_NOTIFY_RECHARGE_TO;
  if (waTo) {
    await sendWhatsAppIfConfigured({
      to: waTo,
      body: `✅ Recharge voye! ${recipientMasked} resevwa $${record.amount_usd} sou ${record.operator}. ID: ${record.reference}\nMèsi — Monican Recharge`,
    });
  }
}

export async function sendRechargeConfirmationEmail(params: {
  to: string | null | undefined;
  reference: string;
  amountUsd: number;
  operator: string;
  recipientMasked: string;
}) {
  if (!params.to) return;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Monican Recharge <${from}>`,
        to: [params.to],
        subject: `✅ Recharge konfime — ${params.reference}`,
        html: `<p>✅ Recharge voye!</p>
          <p><strong>${params.recipientMasked}</strong> resevwa <strong>$${params.amountUsd.toFixed(2)}</strong> sou <strong>${params.operator}</strong>.</p>
          <p>ID: <code>${params.reference}</code></p>
          <p>Mèsi — Monican Recharge</p>`,
      }),
    });
  } catch (e) {
    console.warn("Resend recharge confirm failed", e);
  }
}

export async function sendAdminEmail(subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const to = (process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0] || "").trim();
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `Monican Recharge <${from}>`, to: [to], subject, html }),
    });
  } catch (e) {
    console.warn("sendAdminEmail failed", e);
  }
}

export async function sendHtmlEmail(params: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const to = params.to.trim();
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Monican Recharge <${from}>`,
        to: [to],
        subject: params.subject,
        html: params.html,
      }),
    });
  } catch (e) {
    console.warn("sendHtmlEmail failed", e);
  }
}

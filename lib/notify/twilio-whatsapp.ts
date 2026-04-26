/**
 * WhatsApp sortan (Twilio Sandbox oswa WhatsApp Business).
 * Variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (whatsapp:+1...)
 */
export async function sendWhatsAppIfConfigured(params: { to?: string | null; body: string }) {
  const to = (params.to || "").trim();
  if (!to) return { sent: false, reason: "no_to" };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) return { sent: false, reason: "no_twilio" };

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const form = new URLSearchParams();
  form.set("From", from.startsWith("whatsapp:") ? from : `whatsapp:${from}`);
  form.set("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
  form.set("Body", params.body);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    console.warn("Twilio WhatsApp failed", res.status, t);
    return { sent: false, reason: t };
  }
  return { sent: true };
}

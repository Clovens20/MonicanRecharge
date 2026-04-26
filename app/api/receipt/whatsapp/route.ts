import { NextResponse } from "next/server";
import { sendWhatsAppIfConfigured } from "@/lib/notify/twilio-whatsapp";

type Body = {
  to?: string;
  text?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const rawTo = (body.to || "").trim();
  const digits = rawTo.replace(/\D/g, "");
  if (digits.length < 8) {
    return NextResponse.json({ error: "Numéro WhatsApp invalide (8+ chiffres)." }, { status: 400 });
  }
  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  const send = await sendWhatsAppIfConfigured({
    to: `whatsapp:${digits}`,
    body: text,
  });

  if (!send.sent) {
    if (send.reason === "no_twilio") {
      return NextResponse.json(
        {
          error:
            "WhatsApp non configuré côté serveur. Ajoute TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_WHATSAPP_FROM.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Échec envoi WhatsApp." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Body = {
  to?: string;
  reference?: string;
  operator?: string;
  recipient?: string;
  amountUsd?: number;
  amountLocal?: number;
  currency?: string;
  paymentMethod?: string;
  createdAt?: string;
  cashierName?: string;
  /** `ajan` : resè revandè, san nimewo WhatsApp Monican. */
  receiptVariant?: "caisse" | "ajan";
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const to = (body.to || "").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Imèl envalid" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "Monican Recharge";

  if (!key) {
    return NextResponse.json(
      {
        error:
          "RESEND_API_KEY manquant sur le serveur. Ajoute la clé dans .env (équivalent self-hosted de la Edge Function « voye-imèl-resè »).",
      },
      { status: 503 }
    );
  }

  const subject = "✅ Recharge confirmée — Monican Recharge";
  const ref = esc(body.reference || "—");
  const op = esc(body.operator || "—");
  const rec = esc(body.recipient || "—");
  const amt = typeof body.amountUsd === "number" ? body.amountUsd.toFixed(2) : "—";
  const loc = typeof body.amountLocal === "number" ? String(Math.round(body.amountLocal)) : "—";
  const cur = esc(body.currency || "HTG");
  const pay = esc(body.paymentMethod || "—");
  const caiss = esc(body.cashierName || "—");
  const when = esc(body.createdAt ? new Date(body.createdAt).toLocaleString("fr-FR") : "—");
  const isAjan = body.receiptVariant === "ajan";
  const roleLabel = isAjan ? "Ajan" : "Caissier";
  const footerLine = isAjan
    ? "Merci / Mèsi — monican.shop"
    : "Merci / Mèsi — monican.shop — WhatsApp 717-880-1479";

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:16px;">
  <h1 style="font-size:18px;">MONICAN RECHARGE${isAjan ? " <span style=\"font-size:14px;color:#555;\">(ajan)</span>" : ""}</h1>
  <p style="color:#555;font-size:14px;">recharge.monican.shop</p>
  <hr/>
  <p><strong>Date</strong> : ${when}</p>
  <p><strong>${roleLabel}</strong> : ${caiss}</p>
  <p><strong>Réf.</strong> : ${ref}</p>
  <hr/>
  <p><strong>Destinataire</strong><br/>${rec}</p>
  <p><strong>Opérateur</strong> : ${op}</p>
  <hr/>
  <p><strong>Montant</strong> : $${esc(amt)}</p>
  <p><strong>Équivalent</strong> : ~${loc} ${cur}</p>
  <p><strong>Paiement</strong> : ${pay}</p>
  <hr/>
  <p style="color:#059669;font-weight:bold;">✅ Transaction réussie</p>
  <p style="font-size:13px;color:#555;">${esc(footerLine)}</p>
  </body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: (data as { message?: string }).message || "Resend error" },
      { status: res.status >= 400 ? res.status : 502 }
    );
  }

  return NextResponse.json({ ok: true, id: (data as { id?: string }).id });
}

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";

type Body = {
  non_konplè?: string;
  imèl?: string;
  telefòn?: string;
  non_biznis?: string;
  vil?: string;
  peyi?: string;
  pwomosyon_tekst?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }

  const non_konplè = (body.non_konplè || "").trim();
  const imèl = (body.imèl || "").trim().toLowerCase();
  if (!non_konplè || !imèl || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(imèl)) {
    return NextResponse.json({ error: "Non ak imèl obligatwa" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) {
    return NextResponse.json(
      { error: "Supabase pa konfigire (SERVICE_ROLE + URL)." },
      { status: 503 }
    );
  }

  const { error } = await svc.from("aplasyon_ajan").insert({
    non_konplè,
    imèl,
    telefòn: (body.telefòn || "").trim() || null,
    non_biznis: (body.non_biznis || "").trim() || null,
    vil: (body.vil || "").trim() || null,
    peyi: (body.peyi || "").trim() || null,
    pwomosyon_tekst: (body.pwomosyon_tekst || "").trim() || null,
    estati: "annatant",
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const adminEmail = (process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0] || "").trim();

  if (key && adminEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Monican Recharge <${from}>`,
          to: [adminEmail],
          subject: "Nouvo aplikasyon ajan!",
          html: `<p>Nouvo aplikasyon: <strong>${non_konplè}</strong> (${imèl})</p>`,
        }),
      });
    } catch (e) {
      console.warn("Resend admin notify failed", e);
    }
  }

  if (key) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Monican Recharge <${from}>`,
          to: [imèl],
          subject: "Aplikasyon ou resevwa — Monican Ajan",
          html: `<p>Bonjou ${non_konplè},</p><p>Aplikasyon ou resevwa! N ap revize l nan <strong>24-48 èdtan</strong>.</p><p>Monican Recharge</p>`,
        }),
      });
    } catch (e) {
      console.warn("Resend applicant notify failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}

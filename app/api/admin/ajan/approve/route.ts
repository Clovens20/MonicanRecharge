import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { generateUniqueAgentCode } from "@/lib/ajan/codes";

type Body = { aplasyonId?: string; toKomisyon?: number };

function randomPassword() {
  const base = randomBytes(9).toString("base64url").slice(0, 12);
  return `Aa1!${base}`;
}

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user: adminUser },
  } = await sb.auth.getUser();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!adminUser.email || !isRechargeAdmin(adminUser.id, adminUser.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const aplasyonId = body.aplasyonId;
  const toKomisyon = typeof body.toKomisyon === "number" ? body.toKomisyon : 5;
  if (!aplasyonId) return NextResponse.json({ error: "aplasyonId" }, { status: 400 });
  if (toKomisyon < 0 || toKomisyon > 50) {
    return NextResponse.json({ error: "toKomisyon 0-50" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "SERVICE_ROLE manke" }, { status: 503 });

  const { data: apl, error: e1 } = await svc.from("aplasyon_ajan").select("*").eq("id", aplasyonId).maybeSingle();
  if (e1 || !apl) return NextResponse.json({ error: "Aplikasyon pa jwenn" }, { status: 404 });
  if (apl.estati !== "annatant") return NextResponse.json({ error: "Deja trete" }, { status: 400 });

  const pwd = randomPassword();
  const email = String(apl.imèl).trim().toLowerCase();

  const { data: created, error: e2 } = await svc.auth.admin.createUser({
    email,
    password: pwd,
    email_confirm: true,
    user_metadata: { full_name: apl.non_konplè },
  });

  if (e2 || !created.user) {
    return NextResponse.json(
      { error: e2?.message || "Kreye itilizatè echwe (imèl deja egziste?)", code: e2?.code },
      { status: 409 }
    );
  }

  const uid = created.user.id;

  const code = await generateUniqueAgentCode(async (c) => {
    const { data } = await svc.from("ajan").select("kòd_ajan").eq("kòd_ajan", c).maybeSingle();
    return !!data;
  });

  const { error: e3 } = await svc.from("profils").upsert(
    {
      user_id: uid,
      non_affichaj: apl.non_konplè,
      telefòn: apl.telefòn || null,
    },
    { onConflict: "user_id" }
  );
  if (e3) {
    await svc.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: e3.message }, { status: 500 });
  }

  const { error: e4 } = await svc.from("ajan").insert({
    user_id: uid,
    kòd_ajan: code,
    non_biznis: apl.non_biznis || apl.non_konplè,
    to_komisyon: toKomisyon,
    estati: "aktif",
    approved_by: adminUser.id,
    vil: apl.vil,
    peyi: apl.peyi,
    aplasyon_id: apl.id,
  });
  if (e4) {
    await svc.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: e4.message }, { status: 500 });
  }

  const { error: e5 } = await svc
    .from("aplasyon_ajan")
    .update({ estati: "apwouve", ajan_user_id: uid })
    .eq("id", apl.id);
  if (e5) return NextResponse.json({ error: e5.message }, { status: 500 });

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (key) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Monican Recharge <${from}>`,
          to: [email],
          subject: "Ajan Monican — Aplikasyon apwouve",
          html: `<p>Bonjou ${apl.non_konplè},</p>
            <p><strong>Aplikasyon ou apwouve!</strong></p>
            <p>Lyen ou: <code>?ref=${code}</code></p>
            <p>Imèl koneksyon: <strong>${email}</strong><br/>Modpas tanporè: <strong>${pwd}</strong> (chanje l apre premye koneksyon)</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/konekte">Konekte</a> — tablo ajan: /tableau-de-bord/ajan</p>`,
        }),
      });
    } catch (e) {
      console.warn("Resend approve mail failed", e);
    }
  }

  return NextResponse.json({ ok: true, kòd_ajan: code, user_id: uid, temp_password: pwd });
}

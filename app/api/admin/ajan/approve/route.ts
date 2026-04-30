import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { generateUniqueAgentCode } from "@/lib/ajan/codes";
import { findAuthUserIdByEmail, isInviteEmailAlreadyRegisteredError } from "@/lib/ajan/findAuthUserByEmail";

type Body = { aplasyonId?: string; toKomisyon?: number };

async function sendResendHtml(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Monican Recharge <${from}>`,
        to: [to],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.warn("Resend approve mail failed", e);
  }
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

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL manke (pou lyen envitasyon)" }, { status: 503 });
  }

  const { data: apl, error: e1 } = await svc.from("aplasyon_ajan").select("*").eq("id", aplasyonId).maybeSingle();
  if (e1 || !apl) return NextResponse.json({ error: "Aplikasyon pa jwenn" }, { status: 404 });
  if (apl.estati !== "annatant") return NextResponse.json({ error: "Deja trete" }, { status: 400 });

  const email = String(apl.imèl).trim().toLowerCase();

  const code = await generateUniqueAgentCode(async (c) => {
    const { data } = await svc.from("ajan").select("kòd_ajan").eq("kòd_ajan", c).maybeSingle();
    return !!data;
  });

  const redirectTo = `${appUrl}/ajan/byenveni`;
  const meta = {
    full_name: apl.non_konplè,
    kòd_ajan: code,
  };

  let uid: string;
  let usedInvite: boolean;

  const { data: invited, error: invErr } = await svc.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: meta,
  });

  if (invErr) {
    if (!isInviteEmailAlreadyRegisteredError(invErr)) {
      return NextResponse.json(
        { error: invErr.message || "Envitasyon echwe", code: invErr.code },
        { status: invErr.status && invErr.status >= 400 ? invErr.status : 400 }
      );
    }
    const existingId = await findAuthUserIdByEmail(svc, email);
    if (!existingId) {
      return NextResponse.json(
        { error: "Imèl deja itilize men pa jwenn kont — kontakte sipò." },
        { status: 409 }
      );
    }
    const { data: dejaAjan } = await svc.from("ajan").select("user_id").eq("user_id", existingId).maybeSingle();
    if (dejaAjan) {
      return NextResponse.json({ error: "Kont sa deja anrejistre kòm ajan." }, { status: 409 });
    }
    uid = existingId;
    usedInvite = false;
  } else if (!invited.user) {
    return NextResponse.json({ error: "Envitasyon san itilizatè" }, { status: 500 });
  } else {
    uid = invited.user.id;
    usedInvite = true;
  }

  const { error: e3 } = await svc.from("profils").upsert(
    {
      user_id: uid,
      non_affichaj: apl.non_konplè,
      telefòn: apl.telefòn || null,
    },
    { onConflict: "user_id" }
  );
  if (e3) {
    if (usedInvite) await svc.auth.admin.deleteUser(uid);
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
    if (usedInvite) await svc.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: e4.message }, { status: 500 });
  }

  const { error: e5 } = await svc
    .from("aplasyon_ajan")
    .update({ estati: "apwouve", ajan_user_id: uid })
    .eq("id", apl.id);
  if (e5) {
    await svc.from("ajan").delete().eq("user_id", uid);
    if (usedInvite) await svc.auth.admin.deleteUser(uid);
    return NextResponse.json({ error: e5.message }, { status: 500 });
  }

  const agentPlatformUrl = `${appUrl}/agent`;
  const refUrl = `${appUrl}/?ref=${encodeURIComponent(code)}`;
  const konekteUrl = `${appUrl}/konekte`;

  if (usedInvite) {
    await sendResendHtml(
      email,
      "Monican Recharge — Aplikasyon apwouve (etap modpas)",
      `<p>Bonjou ${apl.non_konplè},</p>
      <p><strong>Aplikasyon ou apwouve!</strong></p>
      <p><strong>1)</strong> Gade <strong>bwat imèl ou</strong> — ou pral resevwa yon mesaj (Monican / Supabase) ak bouton pou <strong>aksepte envitasyon</strong> epi <strong>kreye modpas ou</strong>. Klike lyen an.</p>
      <p><strong>2)</strong> Apre modpas la fin kreye, platfòm revandè ou a (tablo, lyen pèsonèl, komisyon):<br/>
      <a href="${agentPlatformUrl}">${agentPlatformUrl}</a></p>
      <p><strong>3)</strong> Kòd ajan ou: <strong>${code}</strong><br/>
      Lyen pou pataje ak kliyan (URL konplè):<br/>
      <a href="${refUrl}">${refUrl}</a></p>
      <p style="color:#555;font-size:12px;">Pa gen modpas tanporè — sèlman lyen envitasyon an imèl la.</p>`
    );
  } else {
    await sendResendHtml(
      email,
      "Monican Recharge — Aplikasyon apwouve (kont deja egziste)",
      `<p>Bonjou ${apl.non_konplè},</p>
      <p><strong>Aplikasyon ou apwouve!</strong> Ou te deja gen yon kont ak imèl sa a — <strong>konekte</strong> ak modpas ou.</p>
      <p>Kòd ajan ou: <strong>${code}</strong></p>
      <p>Platfòm revandè ou (tablo ajan):<br/>
      <a href="${agentPlatformUrl}">${agentPlatformUrl}</a></p>
      <p>Lyen pou pataje ak kliyan:<br/>
      <a href="${refUrl}">${refUrl}</a></p>
      <p><a href="${konekteUrl}">Konekte isit</a></p>`
    );
  }

  return NextResponse.json({
    ok: true,
    kòd_ajan: code,
    user_id: uid,
    invite_sent: usedInvite,
    existing_account: !usedInvite,
  });
}

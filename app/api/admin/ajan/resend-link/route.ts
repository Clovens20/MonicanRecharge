import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

type Body = { userId?: string };

function createTemporaryPassword(): string {
  const base = randomBytes(8).toString("base64url").slice(0, 10);
  return `Aa1!${base}`;
}

function resolvePublicAppUrl(req: Request): string {
  const app = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  const isLocal = (u: string) => /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(u);
  if (app && !isLocal(app)) return app;
  if (site && !isLocal(site)) return site;
  const origin = new URL(req.url).origin.replace(/\/$/, "");
  return origin;
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
  const userId = body.userId?.trim();
  if (!userId) return NextResponse.json({ error: "userId" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "SERVICE_ROLE manke" }, { status: 503 });

  const appUrl = resolvePublicAppUrl(req);
  if (!appUrl) {
    return NextResponse.json({ error: "URL piblik la manke" }, { status: 503 });
  }

  const { data: ajanRow, error: eAjan } = await svc.from("ajan").select("user_id").eq("user_id", userId).maybeSingle();
  if (eAjan || !ajanRow) return NextResponse.json({ error: "Ajan pa jwenn" }, { status: 404 });

  const { data: authData, error: eUser } = await svc.auth.admin.getUserById(userId);
  if (eUser || !authData.user?.email) {
    return NextResponse.json({ error: eUser?.message || "Imèl pa jwenn" }, { status: 404 });
  }
  const email = authData.user.email;

  const tempPassword = createTemporaryPassword();
  const metadata = {
    ...(authData.user.user_metadata || {}),
    must_change_password: true,
    temp_password_sent_at: new Date().toISOString(),
  };
  const { error: eSet } = await svc.auth.admin.updateUserById(userId, {
    password: tempPassword,
    user_metadata: metadata,
  });
  if (eSet) {
    return NextResponse.json({ error: eSet.message || "Pa ka mete modpas tanporè a" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  if (!key) {
    return NextResponse.json({ error: "RESEND_API_KEY manke pou voye imèl la" }, { status: 503 });
  }

  const agentUrl = `${appUrl}/agent`;
  const loginUrl = `${appUrl}/konekte?next=${encodeURIComponent("/agent")}`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Monican Recharge <${from}>`,
        to: [email],
        subject: "Monican Recharge — Lyen + modpas tanporè ajan",
        html: `<p>Bonjou,</p>
<p>Admin voye yon <strong>nouvo lyen aksè</strong> pou Monican Recharge (ajan / revandè).</p>
<p>Platfòm ajan ou: <a href="${agentUrl}">${agentUrl}</a></p>
<p>Lyen koneksyon dirèk: <a href="${loginUrl}">${loginUrl}</a></p>
<p>Imèl: <strong>${email}</strong><br/>Modpas tanporè: <strong>${tempPassword}</strong></p>
<p><strong>Enpòtan:</strong> sou premye koneksyon an, sistèm nan ap mande w chanje modpas la otomatikman.</p>
<p style="color:#777;font-size:12px;">Pou sekirite, pa pataje modpas sa a. Chanje l touswit apre login.</p>`,
      }),
    });
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ error: "Resend echwe", detail: txt.slice(0, 240) }, { status: 502 });
    }
  } catch (e) {
    console.warn("resend-link mail", e);
    return NextResponse.json({ error: "Voye imèl echwe" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, kind: "temporary_password" });
}

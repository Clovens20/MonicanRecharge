import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { sendHtmlEmail } from "@/lib/notify/resend-notifications";

const ROLES = new Set(["kliyan", "kasiè", "ajan", "admin"]);

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  let body: { userId?: string; action?: "ban" | "unban" | "role" | "reset"; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const userId = body.userId;
  if (!userId) return NextResponse.json({ error: "userId" }, { status: 400 });
  if (userId === user.id) return NextResponse.json({ error: "Pa ka modifye pwòp kont ou" }, { status: 400 });

  if (body.action === "ban") {
    const { error } = await svc.auth.admin.updateUserById(userId, { ban_duration: "876600h" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unban") {
    const { error } = await svc.auth.admin.updateUserById(userId, { ban_duration: "none" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "role") {
    const role = (body.role || "").trim();
    if (!ROLES.has(role)) return NextResponse.json({ error: "role envalid" }, { status: 400 });
    const { data: u, error: e1 } = await svc.auth.admin.getUserById(userId);
    if (e1 || !u?.user) return NextResponse.json({ error: e1?.message || "Pa jwenn" }, { status: 400 });
    const meta = (u.user.app_metadata || {}) as Record<string, unknown>;
    const { error } = await svc.auth.admin.updateUserById(userId, {
      app_metadata: { ...meta, role },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reset") {
    const { data: u, error: e1 } = await svc.auth.admin.getUserById(userId);
    if (e1 || !u?.user?.email) return NextResponse.json({ error: e1?.message || "Pa jwenn imèl" }, { status: 400 });
    const { data: link, error: e2 } = await svc.auth.admin.generateLink({
      type: "recovery",
      email: u.user.email,
    });
    if (e2 || !link?.properties?.action_link) {
      return NextResponse.json({ error: e2?.message || "Link pa kreye" }, { status: 400 });
    }
    await sendHtmlEmail({
      to: u.user.email,
      subject: "Monican Recharge — Reyinisyalize modpas",
      html: `<p>Klike sou lyen sa a pou reyinisyalize modpas ou:</p><p><a href="${link.properties.action_link}">${link.properties.action_link}</a></p>`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action" }, { status: 400 });
}

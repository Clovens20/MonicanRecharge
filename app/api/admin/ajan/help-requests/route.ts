import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

type Body = { id?: string; estati?: "ankou" | "rezoud" | "fèmen"; adminNòt?: string };

async function assertAdmin() {
  const sb = createClient();
  if (!sb) return { ok: false as const, res: NextResponse.json({ error: "Supabase" }, { status: 503 }) };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false as const, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!user.email || !isRechargeAdmin(user.id, user.email)) {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

export async function GET() {
  const admin = await assertAdmin();
  if (!admin.ok) return admin.res;

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { data, error } = await svc
    .from("demann_ed_ajan")
    .select("id,ajan_id,sijè,mesaj,estati,admin_nòt,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ demandes: data || [] });
}

export async function POST(req: Request) {
  const admin = await assertAdmin();
  if (!admin.ok) return admin.res;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }

  const id = body.id?.trim();
  const estati = body.estati;
  if (!id || !estati) return NextResponse.json({ error: "id + estati" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { error } = await svc
    .from("demann_ed_ajan")
    .update({
      estati,
      admin_nòt: (body.adminNòt || "").trim().slice(0, 2000) || null,
      trete_pa: admin.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

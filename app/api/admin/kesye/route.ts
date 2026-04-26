import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { hashKesyeNip, isValidFourDigitNip } from "@/lib/kesye/nip";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });
  const { data, error } = await svc
    .from("kesye")
    .select("id, non_boutik, non_complet, email, tel, nip_temp, aktif, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data || [] });
}

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { non_boutik?: string; non_complet?: string; email?: string; tel?: string; nip?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const non = (body.non_boutik || "").trim();
  const nonComplet = (body.non_complet || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const tel = (body.tel || "").replace(/\D/g, "");
  const nip = body.nip || "";
  if (non.length < 2) return NextResponse.json({ error: "Non two kout" }, { status: 400 });
  if (nonComplet.length < 3) return NextResponse.json({ error: "Non konplè obligatwa" }, { status: 400 });
  if (!email && !tel) return NextResponse.json({ error: "Mete omwen imèl oswa telefòn" }, { status: 400 });
  if (!isValidFourDigitNip(nip)) return NextResponse.json({ error: "NIP 4 chif obligatwa" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });
  const h = hashKesyeNip(nip);
  const { data, error } = await svc
    .from("kesye")
    .insert({ non_boutik: non, non_complet: nonComplet, email: email || null, tel: tel || null, nip_hash: h, nip_temp: true, aktif: true })
    .select("id")
    .maybeSingle();
  if (error) {
    if (String(error.message).includes("duplicate") || String(error.code) === "23505") {
      return NextResponse.json({ error: "NIP deja itilize — chwazi yon lòt" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id });
}

export async function PATCH(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: string; aktif?: boolean; nip?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.aktif === "boolean") patch.aktif = body.aktif;
  if (body.nip && isValidFourDigitNip(body.nip)) {
    patch.nip_hash = hashKesyeNip(body.nip);
    patch.nip_temp = true;
  }

  const { error } = await svc.from("kesye").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

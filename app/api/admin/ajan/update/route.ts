import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

type Body = { userId?: string; toKomisyon?: number; estati?: "aktif" | "sispann" };

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email || !isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  if (!body.userId) return NextResponse.json({ error: "userId" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const patch: Record<string, unknown> = {};
  if (typeof body.toKomisyon === "number") patch.to_komisyon = body.toKomisyon;
  if (body.estati) patch.estati = body.estati;

  const { error } = await svc.from("ajan").update(patch).eq("user_id", body.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

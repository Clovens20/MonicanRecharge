import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user: admin },
  } = await sb.auth.getUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!admin.email || !isRechargeAdmin(admin.id, admin.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { orderPublicId?: string; nòt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  if (!body.orderPublicId) return NextResponse.json({ error: "orderPublicId" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { error } = await svc
    .from("peman_moncash")
    .update({
      estati: "refize",
      admin_id: admin.id,
      admin_nòt: body.nòt || null,
    })
    .eq("order_public_id", body.orderPublicId)
    .eq("estati", "annatant");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

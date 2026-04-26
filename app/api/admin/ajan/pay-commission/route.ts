import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

type Body = { ajanUserId?: string; montant?: number; mòd_peman?: string; referans?: string; nòt?: string };

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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const ajanUserId = body.ajanUserId;
  const montant = typeof body.montant === "number" ? body.montant : NaN;
  if (!ajanUserId || !Number.isFinite(montant) || montant <= 0) {
    return NextResponse.json({ error: "ajanUserId + montant" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { data: ag, error: e1 } = await svc.from("ajan").select("balans_komisyon").eq("user_id", ajanUserId).maybeSingle();
  if (e1 || !ag) return NextResponse.json({ error: "Ajan pa jwenn" }, { status: 404 });
  if (montant > Number(ag.balans_komisyon || 0) + 0.0001) {
    return NextResponse.json({ error: "Montant depase balans" }, { status: 400 });
  }

  const newBal = Number(ag.balans_komisyon || 0) - montant;
  const { error: e2 } = await svc.from("ajan").update({ balans_komisyon: newBal }).eq("user_id", ajanUserId);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const { error: e3 } = await svc.from("peman_komisyon").insert({
    ajan_id: ajanUserId,
    montant,
    mòd_peman: body.mòd_peman || "admin",
    referans: body.referans || `PAY-${Date.now()}`,
    nòt: body.nòt || null,
    paid_by: admin.id,
  });
  if (e3) {
    await svc.from("ajan").update({ balans_komisyon: ag.balans_komisyon }).eq("user_id", ajanUserId);
    return NextResponse.json({ error: e3.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, newBalans: newBal });
}

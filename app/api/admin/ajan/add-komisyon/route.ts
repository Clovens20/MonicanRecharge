import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { applyManualKomisyonCredit } from "@/lib/ajan/manualKomisyonCredit";

type Body = { ajanUserId?: string; montant?: number; nòt?: string; tranzaksyonId?: string };

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

  const ajanUserId = body.ajanUserId?.trim();
  const montant = typeof body.montant === "number" ? body.montant : NaN;
  if (!ajanUserId || !Number.isFinite(montant)) {
    return NextResponse.json({ error: "ajanUserId ak montant (nimero) obligatwa" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const result = await applyManualKomisyonCredit(svc, {
    ajanUserId,
    montant,
    nòt: body.nòt,
    tranzaksyonId: body.tranzaksyonId?.trim() || null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, newBalans: result.newBalans });
}

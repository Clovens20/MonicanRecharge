import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { RechargeBody } from "@/lib/recharge/executeSend";

const FREQ = new Set(["chak_semèn", "chak_2semèn", "chak_mwa"]);

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb.from("rechaj_otomatik").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data || [] });
}

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    nimewo?: string;
    operateur_id?: number;
    montant?: number;
    frekans?: string;
    snapshot?: Partial<RechargeBody>;
    stripe_payment_method_id?: string | null;
    stripe_customer_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }

  const nimewo = (body.nimewo || "").replace(/\D/g, "");
  const op = Number(body.operateur_id);
  const montant = Number(body.montant);
  const frekans = body.frekans || "";
  if (!nimewo || nimewo.length < 4 || !Number.isFinite(op) || !Number.isFinite(montant) || montant <= 0) {
    return NextResponse.json({ error: "Done envalid" }, { status: 400 });
  }
  if (!FREQ.has(frekans)) return NextResponse.json({ error: "frekans" }, { status: 400 });

  const maxTx = parseFloat(process.env.RECHARGE_MAX_USD || "100");
  if (montant > maxTx) return NextResponse.json({ error: `Max $${maxTx}` }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const snapshot: Partial<RechargeBody> = {
    ...body.snapshot,
    operatorId: op,
    amount: montant,
    type: body.snapshot?.type || "airtime",
    planId: body.snapshot?.planId ?? null,
    recipientPhone: body.snapshot?.recipientPhone || { countryCode: "HT", number: nimewo },
    paymentMethod: "stripe",
  };

  const { data, error } = await sb
    .from("rechaj_otomatik")
    .insert({
      user_id: user.id,
      nimewo,
      operateur_id: op,
      montant,
      frekans,
      pwochen_dat: today,
      aktif: true,
      stripe_payment_method_id: body.stripe_payment_method_id || null,
      stripe_customer_id: body.stripe_customer_id || null,
      snapshot,
    })
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

export async function PATCH(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; aktif?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.aktif === "boolean") patch.aktif = body.aktif;
  if (body.aktif === true) patch.pwochen_dat = new Date().toISOString().slice(0, 10);

  const { error } = await sb.from("rechaj_otomatik").update(patch).eq("id", body.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

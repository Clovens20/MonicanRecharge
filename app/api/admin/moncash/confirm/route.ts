import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { buildRechargeFromBody, persistRechargeAndCommission, type RechargeBody } from "@/lib/recharge/executeSend";
import { notifyRechargeSuccess } from "@/lib/notify/resend-notifications";
import { runAfterSuccessfulRecharge } from "@/lib/recharge/post-success";

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

  let body: { orderPublicId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const orderPublicId = body.orderPublicId;
  if (!orderPublicId) return NextResponse.json({ error: "orderPublicId" }, { status: 400 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { data: row, error: e1 } = await svc.from("peman_moncash").select("*").eq("order_public_id", orderPublicId).maybeSingle();
  if (e1 || !row || row.estati !== "annatant") {
    return NextResponse.json({ error: "Pa jwenn oswa deja trete" }, { status: 400 });
  }

  const payload = row.payload as { recharge: RechargeBody; refKod: string | null };
  const ref = payload.refKod || null;
  const built = buildRechargeFromBody({ ...payload.recharge, paymentMethod: "moncash" }, ref);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: 400 });

  await persistRechargeAndCommission(built.record, built.finalAmount, ref, { delayMs: 600 });
  await notifyRechargeSuccess(built.record);
  await runAfterSuccessfulRecharge({
    userId: (row as { user_id?: string | null }).user_id || null,
    record: built.record,
    finalAmountUsd: built.finalAmount,
    context: "normal",
  });

  const { error: e2 } = await svc
    .from("peman_moncash")
    .update({
      estati: "konfime",
      admin_id: admin.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("order_public_id", orderPublicId);
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true, reference: built.record.reference });
}

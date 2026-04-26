import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildRechargeFromBody, persistRechargeAndCommission, type RechargeBody, type RechargeRecord } from "@/lib/recharge/executeSend";
import { verifyKesyeSession, KESYE_SESSION_COOKIE_NAME } from "@/lib/kesye/session-cookie";
import { notifyRechargeSuccess } from "@/lib/notify/resend-notifications";
import { assertRechargeAllowed } from "@/lib/security/recharge-guards";
import { runAfterSuccessfulRecharge } from "@/lib/recharge/post-success";

export async function POST(req: Request) {
  let body: RechargeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.paymentMethod === "moncash") {
    return NextResponse.json(
      {
        success: false,
        error: "Moncash itilize /peye/moncash — swiv enstriksyon sou paj la.",
        redirect: "moncash_flow",
      },
      { status: 400 }
    );
  }

  const cookieRef = cookies().get("monican_ref")?.value;
  const refKod = (body as { refKod?: string }).refKod || cookieRef || null;
  const ref = refKod ? String(refKod).trim() || null : null;

  const sb = createClient();
  let userId: string | null = null;
  let userEmail: string | null = body.userEmail ?? null;
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    userId = user?.id ?? null;
    userEmail = user?.email ?? userEmail;
  }

  const built = buildRechargeFromBody(body, ref);
  if (!built.ok) return NextResponse.json({ success: false, error: built.error }, { status: 400 });

  const kesyeId = verifyKesyeSession(cookies().get(KESYE_SESSION_COOKIE_NAME)?.value);
  let record: RechargeRecord = { ...built.record };
  if (kesyeId) {
    record = { ...record, channel: "caisse", kesye_id: kesyeId };
  }

  const h = headers();
  const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0";

  const guard = await assertRechargeAllowed({
    body,
    finalAmountUsd: built.finalAmount,
    userId,
    userEmail,
    clientIp,
    channel: record.channel,
  });
  if (!guard.ok) {
    return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
  }

  await persistRechargeAndCommission(record, built.finalAmount, ref, { delayMs: 600 });
  await notifyRechargeSuccess(record);
  await runAfterSuccessfulRecharge({
    userId,
    record,
    finalAmountUsd: built.finalAmount,
    context: "normal",
  });

  return NextResponse.json({ success: true, ...record });
}

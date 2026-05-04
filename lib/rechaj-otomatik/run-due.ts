import Stripe from "stripe";
import { getServiceSupabase } from "@/lib/supabase/service";
import { buildRechargeFromBody, persistRechargeAndCommission, type RechargeBody } from "@/lib/recharge/executeSend";
import { getGlobalMarkupConfig } from "@/lib/admin/markup-settings";
import { calculateFinalPrice } from "@/lib/markup";
import { notifyRechargeSuccess } from "@/lib/notify/resend-notifications";
import { runAfterSuccessfulRecharge } from "@/lib/recharge/post-success";
import { nextPwochenDateIso } from "@/lib/rechaj-otomatik/next-date";

type Row = {
  id: string;
  user_id: string;
  nimewo: string;
  operateur_id: number;
  montant: number;
  frekans: string;
  pwochen_dat: string;
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;
  snapshot: RechargeBody;
};

export async function processDueAutoRecharges(): Promise<{ ok: number; skip: number; err: string[] }> {
  const svc = getServiceSupabase();
  if (!svc) return { ok: 0, skip: 0, err: ["no service"] };
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows, error } = await svc
    .from("rechaj_otomatik")
    .select("*")
    .eq("aktif", true)
    .lte("pwochen_dat", today)
    .limit(25);
  if (error) return { ok: 0, skip: 0, err: [error.message] };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey, { typescript: true }) : null;

  let ok = 0;
  let skip = 0;
  const err: string[] = [];

  for (const raw of rows || []) {
    const row = raw as Row;
    if (!row.stripe_payment_method_id || !row.stripe_customer_id || !stripe) {
      skip += 1;
      continue;
    }

    const snap = (row.snapshot || {}) as Partial<RechargeBody>;
    const body: RechargeBody = {
      ...snap,
      operatorId: row.operateur_id,
      amount: Number(row.montant),
      paymentMethod: "stripe",
      type: snap.type ?? "airtime",
      planId: snap.planId ?? null,
      recipientPhone:
        snap.recipientPhone?.number && snap.recipientPhone?.countryCode
          ? snap.recipientPhone
          : { countryCode: "HT", number: String(row.nimewo).replace(/\D/g, "") },
    };

    let email: string | null = null;
    const { data: authData, error: authErr } = await svc.auth.admin.getUserById(row.user_id);
    if (authErr || !authData?.user) {
      err.push(`${row.id}: pa jwenn itilizatè`);
      continue;
    }
    email = authData.user.email || null;
    body.userEmail = email;

    const markupCfg = await getGlobalMarkupConfig();
    const chargeUsd = calculateFinalPrice(Number(row.montant), markupCfg).finalPrice;
    try {
      await stripe.paymentIntents.create({
        amount: Math.round(chargeUsd * 100),
        currency: "usd",
        customer: row.stripe_customer_id,
        payment_method: row.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        metadata: { rechaj_otomatik_id: row.id },
      });
    } catch (e: unknown) {
      err.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const built = buildRechargeFromBody(body, null, markupCfg);
    if (!built.ok) {
      err.push(`${row.id}: ${built.error}`);
      continue;
    }

    await persistRechargeAndCommission(built.record, built.finalAmount, null, { delayMs: 400 });
    await notifyRechargeSuccess(built.record);
    await runAfterSuccessfulRecharge({
      userId: row.user_id,
      record: built.record,
      finalAmountUsd: built.finalAmount,
      context: "otomatik",
    });

    const next = nextPwochenDateIso(row.pwochen_dat, row.frekans);
    await svc
      .from("rechaj_otomatik")
      .update({ pwochen_dat: next, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    ok += 1;
  }

  return { ok, skip, err };
}

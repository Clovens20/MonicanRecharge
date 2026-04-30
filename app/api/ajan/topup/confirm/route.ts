import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

type Body = { sessionId?: string };

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "STRIPE_SECRET_KEY manke" }, { status: 503 });

  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }
  const sessionId = body.sessionId?.trim();
  if (!sessionId) return NextResponse.json({ error: "sessionId obligatwa" }, { status: 400 });

  const stripe = new Stripe(stripeKey, { typescript: true });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const md = session.metadata || {};
  const kind = String(md.kind || "");
  const ajanUserId = String(md.ajanUserId || "");
  const amountUsd = Number(md.amountUsd || 0);

  if (kind !== "ajan_topup" || ajanUserId !== user.id) {
    return NextResponse.json({ error: "Session pa koresponn ak ajan sa a" }, { status: 403 });
  }
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Peman poko valide", statusStripe: session.payment_status }, { status: 400 });
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return NextResponse.json({ error: "Montan top-up invalid" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service role manke" }, { status: 503 });

  const { data: already } = await svc
    .from("ajan_topup_card")
    .select("id,montant_usd")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (already?.id) {
    return NextResponse.json({ ok: true, already: true, montant: Number(already.montant_usd || 0) });
  }

  const { data: ag, error: eAg } = await svc.from("ajan").select("balans_komisyon").eq("user_id", user.id).maybeSingle();
  if (eAg || !ag) return NextResponse.json({ error: "Ajan pa jwenn" }, { status: 404 });

  const balBefore = Number(ag.balans_komisyon || 0);
  const balAfter = Math.round((balBefore + amountUsd) * 100) / 100;

  const { error: eIns } = await svc.from("ajan_topup_card").insert({
    ajan_id: user.id,
    montant_usd: amountUsd,
    stripe_session_id: sessionId,
    stripe_payment_intent_id: session.payment_intent ? String(session.payment_intent) : null,
    estati: "kredi",
  });
  if (eIns) return NextResponse.json({ error: eIns.message }, { status: 500 });

  const { error: eUp } = await svc.from("ajan").update({ balans_komisyon: balAfter }).eq("user_id", user.id);
  if (eUp) {
    await svc.from("ajan_topup_card").delete().eq("stripe_session_id", sessionId);
    return NextResponse.json({ error: eUp.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited: true, amountUsd, newBalance: balAfter });
}

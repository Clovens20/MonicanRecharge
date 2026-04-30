import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function appBaseUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (u) return u;
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return null;
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "STRIPE_SECRET_KEY manke" }, { status: 503 });

  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ag } = await sb.from("ajan").select("user_id,kòd_ajan").eq("user_id", user.id).maybeSingle();
  if (!ag) return NextResponse.json({ error: "Pa ajan" }, { status: 403 });

  let body: { amountUsd?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }
  const amountUsd = typeof body.amountUsd === "number" ? body.amountUsd : NaN;
  if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 5000) {
    return NextResponse.json({ error: "Montan dwe ant $1 ak $5000" }, { status: 400 });
  }

  const base = appBaseUrl();
  if (!base) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL manke" }, { status: 503 });

  const stripe = new Stripe(stripeKey, { typescript: true });
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Top-up kont agent ${ag.kòd_ajan || ""}`.trim(),
            description: "Rechaj otomatik solde agent apre peman valide",
          },
          unit_amount: Math.round(amountUsd * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      kind: "ajan_topup",
      ajanUserId: user.id,
      amountUsd: String(Math.round(amountUsd * 100) / 100),
    },
    success_url: `${base}/ajan/topup-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/agent?topup=cancel`,
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}

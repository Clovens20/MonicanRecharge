import { NextResponse } from "next/server";
import { getKesyeSessionIdOrNull, getStripeTerminalServer } from "@/lib/stripe-terminal/server";

type Body = {
  amount?: number;
  currency?: string;
  description?: string;
};

export async function POST(request: Request) {
  const kesyeId = getKesyeSessionIdOrNull();
  if (!kesyeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripeTerminalServer();
  if (!stripe) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY manquant" }, { status: 503 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount ?? 0);
  const currency = String(body.currency || "usd").trim().toLowerCase();
  const description = String(body.description || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      payment_method_types: ["card_present"],
      capture_method: "manual",
      description: description || undefined,
      metadata: {
        source: "pos_terminal_m2",
        kesye_id: kesyeId,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe Terminal create payment intent error:", error);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}

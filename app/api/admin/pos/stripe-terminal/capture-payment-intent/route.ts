import { NextResponse } from "next/server";
import { getKesyeSessionIdOrNull, getStripeTerminalServer } from "@/lib/stripe-terminal/server";

type Body = {
  paymentIntentId?: string;
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

  const paymentIntentId = String(body.paymentIntentId || "").trim();
  if (!paymentIntentId) {
    return NextResponse.json({ error: "paymentIntentId requis" }, { status: 400 });
  }

  try {
    const current = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (current.status === "succeeded") {
      return NextResponse.json({ paymentIntent: current });
    }
    if (current.status !== "requires_capture") {
      return NextResponse.json(
        { error: `PaymentIntent dans un etat non capturable: ${current.status}` },
        { status: 400 },
      );
    }

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    return NextResponse.json({ paymentIntent });
  } catch (error) {
    console.error("Stripe Terminal capture error:", error);
    return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
  }
}

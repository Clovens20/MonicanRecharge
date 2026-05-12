import { NextResponse } from "next/server";
import {
  getKesyeSessionIdOrNull,
  getStripeTerminalLocationId,
  getStripeTerminalServer,
  getStripeTerminalSimulationEnabled,
} from "@/lib/stripe-terminal/server";

export async function GET() {
  const kesyeId = getKesyeSessionIdOrNull();
  if (!kesyeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    locationId: getStripeTerminalLocationId(),
    simulated: getStripeTerminalSimulationEnabled(),
  });
}

export async function POST() {
  const kesyeId = getKesyeSessionIdOrNull();
  if (!kesyeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripeTerminalServer();
  if (!stripe) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY manquant" }, { status: 503 });
  }

  try {
    const connectionToken = await stripe.terminal.connectionTokens.create();
    return NextResponse.json({ secret: connectionToken.secret });
  } catch (error) {
    console.error("Stripe Terminal connection token error:", error);
    return NextResponse.json({ error: "Failed to create connection token" }, { status: 500 });
  }
}

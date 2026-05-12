import { cookies } from "next/headers";
import Stripe from "stripe";
import { KESYE_SESSION_COOKIE_NAME, verifyKesyeSession } from "@/lib/kesye/session-cookie";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2024-06-20";

export function getStripeTerminalServer(): Stripe | null {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) return null;
  return new Stripe(stripeKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}

export function getStripeTerminalLocationId(): string | null {
  const locationId = process.env.STRIPE_TERMINAL_LOCATION_ID?.trim();
  return locationId || null;
}

export function getStripeTerminalSimulationEnabled(): boolean {
  const raw = process.env.STRIPE_TERMINAL_SIMULATED;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return process.env.NODE_ENV !== "production";
}

export function getKesyeSessionIdOrNull(): string | null {
  return verifyKesyeSession(cookies().get(KESYE_SESSION_COOKIE_NAME)?.value);
}

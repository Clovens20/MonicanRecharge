import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import { assertServiceRole } from "../_shared/auth-service-role.ts";
import { corsOptions, jsonResponse } from "../_shared/cors.ts";
import { getReloadlyBaseUrl, getReloadlyToken } from "../_shared/reloadly-token.ts";

const ALERT_THRESHOLD = Number(Deno.env.get("RELOADLY_BALANCE_ALERT_USD") ?? "50");

/**
 * Lit le solde Reloadly et enregistre un snapshot dans `balans_reloadly`.
 * Protégée par la service role (cron / admin).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "GET" && req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const denied = assertServiceRole(req);
  if (denied) return denied;

  try {
    const token = await getReloadlyToken();
    const base = getReloadlyBaseUrl();

    const res = await fetch(`${base}/accounts/balance`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
      },
    });

    if (!res.ok) {
      return jsonResponse({ error: await res.text() }, res.status);
    }

    const data = (await res.json()) as { balance?: number; currencyCode?: string };
    const balance = Number(data.balance ?? 0);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    await supabase.from("balans_reloadly").insert({
      montant: balance,
      tip: "wè",
      referans: `check-${Date.now()}`,
    });

    if (balance < ALERT_THRESHOLD) {
      console.warn(`⚠️ ALERTE: Balans Reloadly = $${balance} (< $${ALERT_THRESHOLD})`);
    }

    return jsonResponse({
      balance,
      currency: data.currencyCode || "USD",
      alert: balance < ALERT_THRESHOLD,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import { assertServiceRole } from "../_shared/auth-service-role.ts";
import { corsOptions, jsonResponse } from "../_shared/cors.ts";
import { getReloadlyBaseUrl, getReloadlyToken } from "../_shared/reloadly-token.ts";
import { creditAgentKomisyonFromTxId } from "../_shared/credit-agent-komisyon.ts";

/**
 * Envoie une recharge Reloadly (airtime ou data). Réservé aux appels avec la **service role**
 * (ex. webhook Stripe `verifye-stripe`). Ne pas exposer au client sans passerelle sécurisée.
 *
 * POST JSON : operatorId, recipientPhone, countryCode?, amount?, userId?, transactionId (uuid),
 * tip ("airtime" | "data_plan"), bundleId? (requis si data_plan)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const denied = assertServiceRole(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      operatorId?: number | string;
      recipientPhone?: string;
      countryCode?: string;
      amount?: number | string;
      userId?: string;
      transactionId?: string;
      tip?: string;
      bundleId?: number | string;
      planId?: number | string;
    };

    const {
      operatorId,
      recipientPhone,
      countryCode = "HT",
      amount,
      transactionId,
      tip = "airtime",
      bundleId,
      planId,
    } = body;

    if (!operatorId || !recipientPhone || !transactionId) {
      return jsonResponse({ error: "operatorId, recipientPhone et transactionId requis" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tx, error: txError } = await supabase
      .from("tranzaksyon")
      .select("id,estati")
      .eq("id", transactionId)
      .eq("estati", "annatant")
      .maybeSingle();

    if (txError || !tx) {
      return jsonResponse({ error: "Transaction invalide ou déjà traitée" }, 400);
    }

    const token = await getReloadlyToken();
    const base = getReloadlyBaseUrl();
    const number = String(recipientPhone).replace(/[\s+\-()]/g, "");
    const cc = String(countryCode).toUpperCase().slice(0, 2);
    const customIdentifier = `MONICAN-${transactionId}`;

    const senderCountry = Deno.env.get("RELOADLY_SENDER_COUNTRY") ?? "US";
    const senderNumber = Deno.env.get("RELOADLY_SENDER_NUMBER") ?? "17178801479";

    const isData = tip === "data_plan";
    const bundle = bundleId ?? planId;
    if (isData && (bundle == null || bundle === "")) {
      return jsonResponse({ error: "bundleId (ou planId) requis pour data_plan" }, 400);
    }

    let endpoint = `${base}/topups`;
    let payload: Record<string, unknown>;

    if (isData) {
      endpoint = `${base}/topups/data-bundles`;
      payload = {
        operatorId: Number(operatorId),
        bundleId: Number(bundle),
        useLocalAmount: false,
        customIdentifier,
        recipientPhone: { countryCode: cc, number },
        senderPhone: { countryCode: senderCountry, number: String(senderNumber).replace(/\D/g, "") },
      };
    } else {
      if (amount == null) return jsonResponse({ error: "amount requis pour airtime" }, 400);
      payload = {
        operatorId: Number(operatorId),
        amount: Number(amount),
        useLocalAmount: false,
        customIdentifier,
        recipientPhone: { countryCode: cc, number },
        senderPhone: { countryCode: senderCountry, number: String(senderNumber).replace(/\D/g, "") },
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/com.reloadly.topups-v1+json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const msg = String(result.message ?? result.errorMessage ?? JSON.stringify(result));
      await supabase
        .from("tranzaksyon")
        .update({
          estati: "echwe",
          mesaj_estati: msg.slice(0, 2000),
        })
        .eq("id", transactionId);

      return jsonResponse({ success: false, error: msg }, 400);
    }

    const rid = result.transactionId ?? result.id;
    const st = String(result.status ?? "").toUpperCase();

    await supabase
      .from("tranzaksyon")
      .update({
        reloadly_transaction_id: rid != null ? String(rid) : null,
        estati: st === "SUCCESSFUL" ? "siksè" : "annatant",
      })
      .eq("id", transactionId);

    if (st === "SUCCESSFUL") {
      await creditAgentKomisyonFromTxId(supabase, String(transactionId));
    }

    return jsonResponse({
      success: true,
      transactionId: rid,
      status: result.status,
      operatorTransactionId: result.operatorTransactionId,
    });
  } catch (e) {
    console.error("voye-recharge:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ success: false, error: msg }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-reloadly-signature",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Valide un UUID v4 (id Supabase). */
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

async function verifyReloadlySignature(rawBody: string, headerSig: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret?.trim()) return true;
  if (!headerSig) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = hex.toLowerCase();
  const got = headerSig.replace(/^sha256=/i, "").trim().toLowerCase();
  if (got.length !== expected.length) return false;
  let ok = 0;
  for (let i = 0; i < expected.length; i++) ok |= expected.charCodeAt(i) ^ got.charCodeAt(i);
  return ok === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const signature = req.headers.get("x-reloadly-signature");
  if (!signature) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const webhookSecret = Deno.env.get("RELOADLY_WEBHOOK_SECRET");

  if (!(await verifyReloadlySignature(rawBody, signature, webhookSecret))) {
    console.warn("reloadly-webhook: signature invalide");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  console.log("Reloadly Webhook reçu:", rawBody.slice(0, 2000));

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("reloadly-webhook: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
    return json({ error: "Server misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const status = String(body.status ?? body.Status ?? "").toUpperCase();
  const transactionId = body.transactionId ?? body.transaction_id ?? body.TransactionId;
  const customIdentifier = body.customIdentifier ?? body.custom_identifier ?? body.CustomIdentifier;
  const customStr = typeof customIdentifier === "string" ? customIdentifier : "";
  const transactionUuid = customStr.replace(/^MONICAN-/i, "").trim();

  if (!transactionUuid || !isUuid(transactionUuid)) {
    console.warn("reloadly-webhook: customIdentifier / UUID invalide", customStr);
    return json({ received: true, warning: "ignored_no_valid_uuid" }, 200);
  }

  const errMsg =
    (typeof body.errorMessage === "string" && body.errorMessage) ||
    (typeof body.error_message === "string" && body.error_message) ||
    "Echèk recharge";

  if (status === "SUCCESSFUL") {
    const { error } = await supabase
      .from("tranzaksyon")
      .update({
        estati: "siksè",
        reloadly_transaction_id: transactionId != null ? String(transactionId) : null,
        pibliye_le: new Date().toISOString(),
      })
      .eq("id", transactionUuid);

    if (error) {
      console.error("reloadly-webhook SUCCESSFUL update:", error.message);
      return json({ received: false, error: error.message }, 500);
    }
    console.log(`✅ Recharge ${transactionId} → tranzaksyon ${transactionUuid}`);
  } else if (status === "FAILED") {
    const { error } = await supabase
      .from("tranzaksyon")
      .update({
        estati: "echwe",
        mesaj_estati: errMsg,
      })
      .eq("id", transactionUuid);

    if (error) {
      console.error("reloadly-webhook FAILED update:", error.message);
      return json({ received: false, error: error.message }, 500);
    }
    console.log(`❌ Recharge ${transactionId} echwe → ${transactionUuid}`);
  } else if (status === "REFUNDED") {
    const { error } = await supabase.from("tranzaksyon").update({ estati: "ranbouse" }).eq("id", transactionUuid);

    if (error) {
      console.error("reloadly-webhook REFUNDED update:", error.message);
      return json({ received: false, error: error.message }, 500);
    }
    console.log(`💰 Ranbousman konfime → ${transactionUuid}`);
  } else {
    console.log("reloadly-webhook: statut non géré:", status);
  }

  return json({ received: true }, 200);
});
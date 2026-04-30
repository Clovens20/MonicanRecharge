/**
 * Webhook Reloadly — statuts différés (PROCESSING → SUCCESSFUL / FAILED)
 *
 * 📍 Placer ce fichier dans :
 *    app/api/webhooks/reloadly/route.ts
 *
 * 🔧 Variables .env requises :
 *    RELOADLY_WEBHOOK_SECRET=<signing secret du dashboard Reloadly>
 *
 * 🌐 URL à saisir dans Reloadly Dashboard > Developers > Webhooks :
 *    https://recharge.monican.shop/api/webhooks/reloadly
 *
 * 📡 IPs Reloadly autorisées (déjà filtrées dans le code) :
 *    54.84.138.60  |  54.84.66.109
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import { creditAgentCommissionFromTranzaksyonId } from "@/lib/ajan/creditFromTranzaksyon";

// IPs officielles Reloadly (visibles sur ton dashboard)
const RELOADLY_IPS = ["54.84.138.60", "54.84.66.109"];

// Mapping statuts Reloadly → statuts Monican
const STATUS_MAP: Record<string, string> = {
  SUCCESSFUL: "siksè",
  FAILED:     "echwe",
  REFUNDED:   "echwe",
  PROCESSING: "annatant",
};

/**
 * Vérifie la signature HMAC-SHA256 envoyée par Reloadly.
 * Header : X-Reloadly-Signature
 * Data   : payload + "." + timestamp
 */
function verifySignature(
  secret: string,
  payload: string,
  signature: string,
  timestamp: string,
): boolean {
  const dataToSign = `${payload}.${timestamp}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Vérification IP Reloadly ──────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  if (!RELOADLY_IPS.includes(ip)) {
    console.warn(`[reloadly-webhook] IP non autorisée : ${ip}`);
    // On retourne 200 pour ne pas exposer d'info à un attaquant
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // ── 2. Lecture du body brut (nécessaire pour la signature) ───────────────
  const rawBody = await req.text();

  // ── 3. Vérification de la signature HMAC ─────────────────────────────────
  const webhookSecret = process.env.RELOADLY_WEBHOOK_SECRET?.trim();
  const signature     = req.headers.get("x-reloadly-signature") ?? "";
  const timestamp     = req.headers.get("x-reloadly-request-timestamp") ?? "";

  if (webhookSecret) {
    if (!signature || !timestamp) {
      console.warn("[reloadly-webhook] Headers de signature manquants");
      return NextResponse.json({ error: "Signature manquante" }, { status: 401 });
    }
    if (!verifySignature(webhookSecret, rawBody, signature, timestamp)) {
      console.warn("[reloadly-webhook] Signature invalide");
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }
  } else {
    console.warn("[reloadly-webhook] RELOADLY_WEBHOOK_SECRET non défini — signature non vérifiée !");
  }

  // ── 4. Parsing du payload ─────────────────────────────────────────────────
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  console.log("[reloadly-webhook] Event reçu:", JSON.stringify(event));

  // ── 5. Extraction des données clés ───────────────────────────────────────
  const reloadlyTxId = String(event.transactionId ?? event.id ?? "");
  const customId     = String(event.customIdentifier ?? "");
  const rawStatus    = String(event.status ?? "").toUpperCase();

  if (!reloadlyTxId && !customId) {
    console.warn("[reloadly-webhook] Aucun identifiant dans le payload");
    return NextResponse.json({ received: true });
  }

  // ── 6. Résolution du statut ───────────────────────────────────────────────
  const nouveauStatut = STATUS_MAP[rawStatus] ?? "annatant";

  // ── 7. Mise à jour Supabase ───────────────────────────────────────────────
  const svc = getServiceSupabase();
  if (!svc) {
    console.error("[reloadly-webhook] Supabase service non configuré");
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 503 });
  }

  const internalId = customId.startsWith("MONICAN-")
    ? customId.replace("MONICAN-", "")
    : null;

  let query = svc.from("tranzaksyon").update({
    estati: nouveauStatut,
    reloadly_transaction_id: reloadlyTxId || null,
    mesaj_estati: rawStatus,
  });

  if (internalId) {
    query = query.eq("id", internalId);
  } else {
    query = query.eq("reloadly_transaction_id", reloadlyTxId);
  }

  const { error: updErr } = await query;

  if (updErr) {
    console.error("[reloadly-webhook] Erreur mise à jour Supabase:", updErr.message);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  console.log(
    `[reloadly-webhook] ✅ Transaction ${internalId ?? reloadlyTxId} → ${nouveauStatut}`,
  );

  if (nouveauStatut === "siksè") {
    let txUuid: string | null = internalId;
    if (!txUuid && reloadlyTxId) {
      const { data: row } = await svc.from("tranzaksyon").select("id").eq("reloadly_transaction_id", reloadlyTxId).maybeSingle();
      txUuid = row?.id ? String(row.id) : null;
    }
    if (txUuid) {
      void creditAgentCommissionFromTranzaksyonId(txUuid).catch((e) =>
        console.warn("[reloadly-webhook] commission:", e instanceof Error ? e.message : e),
      );
    }
  }

  // ── 8. Toujours répondre 200 à Reloadly ──────────────────────────────────
  return NextResponse.json({ received: true });
}
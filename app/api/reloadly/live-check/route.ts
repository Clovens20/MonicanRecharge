import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import {
  fetchReloadlyAccessToken,
  fetchReloadlyWalletBalance,
  getReloadlyBaseUrl,
  getReloadlyCredentials,
  isReloadlySandbox,
} from "@/lib/reloadly/auth";

/**
 * Vérifie en temps réel : OAuth Reloadly + lecture du solde Topups.
 * Accès : administrateur connecté, OU `Authorization: Bearer <CRON_SECRET>` si CRON_SECRET est défini.
 *
 * GET /api/reloadly/live-check
 */
export async function GET() {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = headers().get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const cronOk = Boolean(cronSecret && bearer && bearer === cronSecret);

  if (!cronOk) {
    const sb = createClient();
    if (!sb) {
      return NextResponse.json({ ok: false, error: "Supabase non configuré" }, { status: 503 });
    }

    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }
    if (!isRechargeAdmin(user.id, user.email)) {
      return NextResponse.json({ ok: false, error: "Accès réservé aux administrateurs" }, { status: 403 });
    }
  }

  const creds = getReloadlyCredentials();
  if (!creds) {
    return NextResponse.json(
      {
        ok: false,
        step: "env",
        error:
          "RELOADLY_CLIENT_ID + RELOADLY_CLIENT_SECRET manquants (le « secret » du dashboard Reloadly, pas seulement l’ID).",
      },
      { status: 503 },
    );
  }

  try {
    await fetchReloadlyAccessToken();
    const wallet = await fetchReloadlyWalletBalance();
    return NextResponse.json({
      ok: true,
      oauth: true,
      environment: isReloadlySandbox() ? "sandbox" : "live",
      baseUrl: getReloadlyBaseUrl(),
      walletBalance: wallet.balance,
      walletCurrency: wallet.currencyCode,
      hint:
        "Les Edge Functions Supabase (voye-recharge) lisent leurs secrets sur le cloud : supabase secrets set RELOADLY_CLIENT_ID … RELOADLY_CLIENT_SECRET …",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        step: "reloadly",
        error: msg,
        environment: isReloadlySandbox() ? "sandbox" : "live",
        baseUrl: getReloadlyBaseUrl(),
      },
      { status: 502 },
    );
  }
}

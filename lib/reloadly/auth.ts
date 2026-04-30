/**
 * OAuth2 Reloadly (client credentials) — côté serveur Next uniquement.
 * @see https://developers.reloadly.com — auth.reloadly.com/oauth/token + audience Topups API
 *
 * Variables (.env) :
 * - RELOADLY_CLIENT_ID (ou RELOADLY_API_CLIENT_ID)
 * - RELOADLY_CLIENT_SECRET (ou RELOADLY_API_SECRET / RELOADLY_API_KEY si tu as mis le « secret » sous ce nom)
 * - RELOADLY_SANDBOX_MODE=true → audience https://topups-sandbox.reloadly.com
 */

const AUTH_URL = "https://auth.reloadly.com/oauth/token";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isReloadlySandbox(): boolean {
  return process.env.RELOADLY_SANDBOX_MODE === "true";
}

/** Audience OAuth = URL de l’API Topups (sandbox ou live). */
export function getReloadlyAudience(): string {
  return isReloadlySandbox() ? "https://topups-sandbox.reloadly.com" : "https://topups.reloadly.com";
}

export function getReloadlyBaseUrl(): string {
  return getReloadlyAudience();
}

export function getReloadlyCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId =
    process.env.RELOADLY_CLIENT_ID?.trim() || process.env.RELOADLY_API_CLIENT_ID?.trim() || "";
  const clientSecret =
    process.env.RELOADLY_CLIENT_SECRET?.trim() ||
    process.env.RELOADLY_API_SECRET?.trim() ||
    process.env.RELOADLY_API_KEY?.trim() ||
    "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function fetchReloadlyAccessToken(): Promise<string> {
  const creds = getReloadlyCredentials();
  if (!creds) {
    throw new Error(
      "Identifiants Reloadly manquants : définis RELOADLY_CLIENT_ID et RELOADLY_CLIENT_SECRET (secret client du dashboard, pas la clé publique seule).",
    );
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "client_credentials",
      audience: getReloadlyAudience(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reloadly OAuth ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = Number(data.expires_in) || 3600;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return data.access_token;
}

/** Solde portefeuille Topups (GET /accounts/balance). */
export async function fetchReloadlyWalletBalance(): Promise<{ balance: number; currencyCode: string }> {
  const token = await fetchReloadlyAccessToken();
  const base = getReloadlyBaseUrl();
  const res = await fetch(`${base}/accounts/balance`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/com.reloadly.topups-v1+json",
    },
  });
  if (!res.ok) {
    throw new Error(`Reloadly balance ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { balance?: number; currencyCode?: string };
  return {
    balance: Number(data.balance ?? 0),
    currencyCode: String(data.currencyCode || "USD"),
  };
}

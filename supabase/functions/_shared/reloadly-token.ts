/**
 * Token OAuth2 Reloadly (client credentials) — cache en mémoire sur instance chaude.
 * Import : `import { getReloadlyToken, getReloadlyBaseUrl, isReloadlySandbox } from "../_shared/reloadly-token.ts"`
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

const AUTH_URL = "https://auth.reloadly.com/oauth/token";

export function isReloadlySandbox(): boolean {
  return Deno.env.get("RELOADLY_SANDBOX_MODE") === "true";
}

export function getReloadlyAudience(): string {
  return isReloadlySandbox() ? "https://topups-sandbox.reloadly.com" : "https://topups.reloadly.com";
}

export function getReloadlyBaseUrl(): string {
  return isReloadlySandbox() ? "https://topups-sandbox.reloadly.com" : "https://topups.reloadly.com";
}

export async function getReloadlyToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get("RELOADLY_CLIENT_ID");
  const clientSecret = Deno.env.get("RELOADLY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Missing RELOADLY_CLIENT_ID or RELOADLY_CLIENT_SECRET");
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      audience: getReloadlyAudience(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Reloadly auth failed: ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  const expiresIn = Number(data.expires_in) || 3600;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return cachedToken.token;
}

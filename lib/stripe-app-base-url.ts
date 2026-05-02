const trimBase = (s: string | undefined) => s?.trim().replace(/\/$/, "") || "";

const isLocalOrigin = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(url);

function vercelHttpsOrigin(): string | null {
  const v = process.env.VERCEL_URL?.trim();
  if (!v) return null;
  return `https://${v.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}

/**
 * Origine publique (https) pour `success_url` / `cancel_url` Stripe côté serveur.
 * Essaie dans l’ordre : `APP_URL`, `NEXT_PUBLIC_APP_URL`, `VERCEL_URL` (Vercel).
 * En production, ignore les origines localhost pour éviter les redirections post-paiement vers le poste client.
 */
export function stripeCheckoutPublicBaseUrl(): string | null {
  const candidates: string[] = [];
  const add = (s: string | undefined) => {
    const t = trimBase(s);
    if (t) candidates.push(t);
  };
  add(process.env.APP_URL);
  add(process.env.NEXT_PUBLIC_APP_URL);
  const vercel = vercelHttpsOrigin();
  if (vercel) candidates.push(vercel);

  const prod = process.env.NODE_ENV === "production";
  for (const url of candidates) {
    if (prod && isLocalOrigin(url)) continue;
    return url;
  }
  return null;
}

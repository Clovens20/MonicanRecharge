import { corsOptions, jsonResponse } from "../_shared/cors.ts";
import { getReloadlyBaseUrl, getReloadlyToken } from "../_shared/reloadly-token.ts";

/**
 * POST { phone, countryCode } — détection opérateur Reloadly (JWT utilisateur requis via verify_jwt).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const body = (await req.json()) as { phone?: string; countryCode?: string };
    const { phone, countryCode } = body;

    if (!phone || !countryCode) {
      return jsonResponse({ error: "phone et countryCode requis" }, 400);
    }

    const token = await getReloadlyToken();
    const base = getReloadlyBaseUrl();
    const cleanPhone = String(phone).replace(/[\s+\-()]/g, "");
    const cc = String(countryCode).toUpperCase().slice(0, 2);

    const url =
      `${base}/operators/auto-detect/phone/${encodeURIComponent(cleanPhone)}/countries/${encodeURIComponent(cc)}?suggestedAmountsMap=true`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      return jsonResponse({ error: `Reloadly error: ${txt}` }, res.status);
    }

    const operator = (await res.json()) as Record<string, unknown>;
    const country = operator.country as Record<string, string> | undefined;

    return jsonResponse({
      operatorId: operator.operatorId ?? operator.id,
      operatorName: operator.name,
      countryCode: country?.isoCode ?? country?.isoName ?? cc,
      suggestedAmounts: operator.suggestedAmounts ?? [5, 10, 15, 20, 25, 50],
      logoUrl: Array.isArray(operator.logoUrls) ? operator.logoUrls[0] : (operator.logoUrls as string | null) ?? null,
      localAmounts: operator.localAmounts ?? false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});

import { corsOptions, jsonResponse } from "../_shared/cors.ts";
import { getReloadlyBaseUrl, getReloadlyToken } from "../_shared/reloadly-token.ts";
import { digitsOnly, validatePhone, effectiveCountryForReloadly, detectHaiti } from "../../../lib/operator-detection.ts";

/**
 * POST { phone, countryCode } — validation locale + pays effectif NANP, puis Reloadly auto-detect.
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

    const phoneDigits = digitsOnly(String(phone));
    const cc = String(countryCode).toUpperCase().slice(0, 2);
    const effectiveCc = effectiveCountryForReloadly(phoneDigits, cc);
    const v = validatePhone(phoneDigits, effectiveCc);
    if (!v.valid && v.partial) {
      return jsonResponse({ operatorId: null, incomplete: true }, 200);
    }
    if (!v.valid) {
      return jsonResponse({ error: v.error || "INVALID_PHONE", type: "INVALID_PHONE" }, 400);
    }

    if (effectiveCc === "HT") {
      let locHt = phoneDigits;
      if (locHt.startsWith("509")) locHt = locHt.slice(3);
      locHt = locHt.replace(/^0+/, "") || locHt;
      const h = locHt.length === 8 ? detectHaiti(locHt) : null;
      return jsonResponse({
        operatorId: h?.operatorId ?? null,
        operatorName: h?.operatorName ?? null,
        countryCode: "HT",
        suggestedAmounts: [5, 10, 15, 20, 25, 50],
        logoUrl: null,
        localAmounts: false,
        source: "local",
      });
    }

    const token = await getReloadlyToken();
    const base = getReloadlyBaseUrl();
    const candidates = (() => {
      const d = phoneDigits;
      const list = [phoneDigits, d];
      const nanp = new Set(["US", "CA", "DO", "PR", "JM", "TT"]);
      if (nanp.has(effectiveCc) && d.length === 10 && !d.startsWith("1")) list.push(`1${d}`);
      return [...new Set(list.filter(Boolean))];
    })();

    for (const candidate of candidates) {
      const url =
        `${base}/operators/auto-detect/phone/${encodeURIComponent(candidate)}/countries/${encodeURIComponent(effectiveCc)}?suggestedAmountsMap=true`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/com.reloadly.topups-v1+json",
        },
      });

      if (!res.ok) continue;

      const operator = (await res.json()) as Record<string, unknown>;
      const id = Number(operator.operatorId ?? operator.id);
      if (!Number.isFinite(id) || id <= 0) continue;

      const country = operator.country as Record<string, string> | undefined;
      return jsonResponse({
        operatorId: id,
        operatorName: operator.name,
        countryCode: country?.isoCode ?? country?.isoName ?? effectiveCc,
        suggestedAmounts: operator.suggestedAmounts ?? [5, 10, 15, 20, 25, 50],
        logoUrl: Array.isArray(operator.logoUrls) ? operator.logoUrls[0] : (operator.logoUrls as string | null) ?? null,
        localAmounts: operator.localAmounts ?? false,
        source: "reloadly",
      });
    }

    return jsonResponse({ error: "No operator match", operatorId: null }, 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});

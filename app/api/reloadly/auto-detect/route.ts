import { NextResponse } from "next/server";
import { detectOperator } from "@/lib/reloadly/mock";
import { validatePhone, effectiveCountryForReloadly, digitsOnly } from "@/lib/operator-detection";
import { fetchReloadlyAccessToken, getReloadlyBaseUrl, getReloadlyCredentials } from "@/lib/reloadly/auth";

type ReloadlyDetectShape = {
  operatorId?: number;
  id?: number;
  name?: string;
  logoUrls?: string[] | string;
  suggestedAmounts?: number[];
  country?: { isoCode?: string; isoName?: string };
};

export async function POST(req: Request) {
  let body: { phone?: string; countryCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ operator: null, error: "JSON invalide" }, { status: 400 });
  }

  const phoneDigits = digitsOnly(String(body.phone || ""));
  const countryCode = String(body.countryCode || "").toUpperCase().slice(0, 2);
  if (!phoneDigits || !countryCode) {
    return NextResponse.json({ operator: null, error: "phone et countryCode requis" }, { status: 400 });
  }

  const effectiveCc = effectiveCountryForReloadly(phoneDigits, countryCode);
  const v = validatePhone(phoneDigits, effectiveCc);
  if (!v.valid && v.partial) {
    return NextResponse.json({ operator: null, source: "incomplete" as const });
  }
  if (!v.valid) {
    return NextResponse.json(
      { operator: null, error: v.error || "INVALID_PHONE", type: "INVALID_PHONE" as const },
      { status: 400 },
    );
  }

  if (effectiveCc === "HT") {
    const mockOp = detectOperator(phoneDigits, "HT");
    return NextResponse.json({ operator: mockOp, source: "mock" as const });
  }

  const nanpIso = new Set(["US", "CA", "DO", "PR", "JM", "TT"]);
  const phoneCandidates = (() => {
    const d = phoneDigits.replace(/\D/g, "");
    const list = [phoneDigits, d];
    if (nanpIso.has(effectiveCc) && d.length === 10 && !d.startsWith("1")) {
      list.push(`1${d}`);
    }
    return [...new Set(list.filter(Boolean))];
  })();

  if (getReloadlyCredentials()) {
    try {
      const token = await fetchReloadlyAccessToken();
      const base = getReloadlyBaseUrl();
      for (const candidate of phoneCandidates) {
        const url = `${base}/operators/auto-detect/phone/${encodeURIComponent(candidate)}/countries/${encodeURIComponent(effectiveCc)}?suggestedAmountsMap=true`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/com.reloadly.topups-v1+json",
          },
        });
        if (res.ok) {
          const raw = (await res.json()) as ReloadlyDetectShape;
          const id = Number(raw.operatorId ?? raw.id);
          if (Number.isFinite(id) && id > 0) {
            const logoUrl = Array.isArray(raw.logoUrls) ? raw.logoUrls[0] : typeof raw.logoUrls === "string" ? raw.logoUrls : null;
            const cc = raw.country?.isoCode || effectiveCc;
            return NextResponse.json({
              operator: {
                id,
                name: String(raw.name || "Operator"),
                logoUrl,
                countryCode: String(cc).toUpperCase().slice(0, 2),
                suggestedAmounts: Array.isArray(raw.suggestedAmounts)
                  ? raw.suggestedAmounts.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
                  : [5, 10, 15, 20, 25, 50],
              },
              source: "reloadly" as const,
            });
          }
        }
      }
    } catch (e) {
      console.warn("reloadly auto-detect:", e instanceof Error ? e.message : e);
    }
  }

  const mockOp = detectOperator(phoneDigits, effectiveCc);
  return NextResponse.json({
    operator: mockOp,
    source: "mock" as const,
  });
}

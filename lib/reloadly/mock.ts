// Reloadly mock service — replace with real SDK when RELOADLY_CLIENT_ID/SECRET are set.

import { detectHaiti } from "@/lib/operator-detection";

export type Operator = {
  id: number;
  name: string;
  countryCode: string;
  countryName: string;
  flag: string;
  logoUrl: string;
  fxRate: number; // local per USD
  currency: string;
  prefixes: string[];
  type: "airtime" | "data" | "both";
};

export type DataPlan = {
  id: string;
  operatorId: number;
  name: string;
  data: string;
  validity: string;
  priceUsd: number;
  popular?: boolean;
  /** ID bundle Reloadly (API data-bundles) — obligatwa pou voye forfait data an reyèl. */
  reloadlyBundleId?: number;
};

export const OPERATORS: Operator[] = [
  {
    id: 173,
    name: "Digicel Haiti",
    countryCode: "HT",
    countryName: "Haiti",
    flag: "🇭🇹",
    logoUrl: "/operators/digicel.svg",
    fxRate: 132,
    currency: "HTG",
    prefixes: ["34", "37", "38", "46", "47", "48"],
    type: "both",
  },
  {
    id: 528,
    name: "Natcom Haiti",
    countryCode: "HT",
    countryName: "Haiti",
    flag: "🇭🇹",
    logoUrl: "/operators/natcom.svg",
    fxRate: 132,
    currency: "HTG",
    prefixes: ["32", "33", "36", "39", "40", "41", "42", "43", "44", "45"],
    type: "both",
  },
  {
    id: 24,
    name: "AT&T USA",
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    logoUrl: "/operators/att.svg",
    fxRate: 1,
    currency: "USD",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 91,
    name: "T-Mobile USA",
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    logoUrl: "/operators/tmobile.svg",
    fxRate: 1,
    currency: "USD",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 998,
    name: "Verizon USA",
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    logoUrl: "/operators/att.svg",
    fxRate: 1,
    currency: "USD",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 997,
    name: "Rogers Canada",
    countryCode: "CA",
    countryName: "Canada",
    flag: "🇨🇦",
    logoUrl: "/operators/tmobile.svg",
    fxRate: 1,
    currency: "CAD",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 996,
    name: "Bell Canada",
    countryCode: "CA",
    countryName: "Canada",
    flag: "🇨🇦",
    logoUrl: "/operators/att.svg",
    fxRate: 1,
    currency: "CAD",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 995,
    name: "Telus Canada",
    countryCode: "CA",
    countryName: "Canada",
    flag: "🇨🇦",
    logoUrl: "/operators/orange.svg",
    fxRate: 1,
    currency: "CAD",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 301,
    name: "Orange France",
    countryCode: "FR",
    countryName: "France",
    flag: "🇫🇷",
    logoUrl: "/operators/orange.svg",
    fxRate: 1,
    currency: "EUR",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 302,
    name: "SFR France",
    countryCode: "FR",
    countryName: "France",
    flag: "🇫🇷",
    logoUrl: "/operators/tmobile.svg",
    fxRate: 1,
    currency: "EUR",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 303,
    name: "Bouygues Telecom",
    countryCode: "FR",
    countryName: "France",
    flag: "🇫🇷",
    logoUrl: "/operators/claro.svg",
    fxRate: 1,
    currency: "EUR",
    prefixes: [],
    type: "airtime",
  },
  {
    id: 304,
    name: "Free Mobile",
    countryCode: "FR",
    countryName: "France",
    flag: "🇫🇷",
    logoUrl: "/operators/digicel.svg",
    fxRate: 1,
    currency: "EUR",
    prefixes: [],
    type: "airtime",
  },
  /** RD — IDs à aligner sur Reloadly (GET /operators?countryIsoName=Dominican+Republic) si les recharges réelles échouent. */
  {
    id: 1643,
    name: "Altice Dominicana",
    countryCode: "DO",
    countryName: "Dominican Republic",
    flag: "🇩🇴",
    logoUrl: "/operators/orange.svg",
    fxRate: 1,
    currency: "USD",
    prefixes: ["809", "829"],
    type: "airtime",
  },
  {
    id: 1644,
    name: "Claro Dominicana",
    countryCode: "DO",
    countryName: "Dominican Republic",
    flag: "🇩🇴",
    logoUrl: "/operators/claro.svg",
    fxRate: 1,
    currency: "USD",
    prefixes: ["849"],
    type: "airtime",
  },
];

export const DATA_PLANS: DataPlan[] = [
  { id: "dgc-1", operatorId: 173, name: "Digi Daily", data: "1 GB", validity: "24h", priceUsd: 1.5 },
  { id: "dgc-2", operatorId: 173, name: "Digi Weekly", data: "5 GB", validity: "7d", priceUsd: 5, popular: true },
  { id: "dgc-3", operatorId: 173, name: "Digi Monthly", data: "20 GB", validity: "30d", priceUsd: 18 },
  { id: "dgc-4", operatorId: 173, name: "Digi Mega", data: "60 GB", validity: "30d", priceUsd: 35 },
  { id: "ntc-1", operatorId: 528, name: "Natcom Mini", data: "500 MB", validity: "24h", priceUsd: 1 },
  { id: "ntc-2", operatorId: 528, name: "Natcom Plus", data: "3 GB", validity: "7d", priceUsd: 4, popular: true },
  { id: "ntc-3", operatorId: 528, name: "Natcom Max", data: "15 GB", validity: "30d", priceUsd: 15 },
];

/** Chiffres nationaux pour détection (sans indicatif pays). */
function digitsNationalForDetect(phone: string): string {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

export function detectOperator(phone: string, countryCode: string): Operator | null {
  const cc = String(countryCode || "").toUpperCase().slice(0, 2);
  const cleaned = phone.replace(/\D/g, "").replace(/^509/, "");
  if (cc === "HT") {
    let loc = cleaned;
    if (cleaned.startsWith("509")) loc = cleaned.slice(3);
    loc = loc.replace(/^0+/, "") || loc;
    if (loc.length < 8) return null;
    const eight = loc.slice(0, 8);
    const h = detectHaiti(eight);
    if (!h?.operatorId) return null;
    return OPERATORS.find((o) => o.id === h.operatorId) || null;
  }

  if (cc === "DO") {
    const nat = digitsNationalForDetect(phone);
    if (nat.length < 10) return null;
    const ops = OPERATORS.filter((o) => o.countryCode === "DO");
    for (const op of ops) {
      if (op.prefixes.length > 0 && op.prefixes.some((p) => nat.startsWith(p))) return op;
    }
    return ops[0] || null;
  }

  return OPERATORS.find((o) => o.countryCode === cc) || null;
}

export const QUICK_AMOUNTS = [5, 10, 15, 20, 25, 50];

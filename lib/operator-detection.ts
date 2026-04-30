/**
 * Détection opérateur / pays NANP **avant** Reloadly — Haïti 100 % local, DO/CA prioritaires sur US pour +1.
 * Les IDs opérateur Haïti / mock doivent rester alignés sur Reloadly en production.
 */

export interface OperatorResult {
  operatorId: number | null;
  operatorName: string;
  countryCode: string;
  countryName: string;
  flag: string;
  color: string;
  confidence: "high" | "medium" | "low";
  useReloadly: boolean;
}

/** 36xxxx = Natcom (évite confusion Digicel). Autres préfixes alignés opérateurs HT. */
const DIGICEL_HT_2 = new Set(["34", "37", "38", "46", "47", "48"]);
const NATCOM_HT_2 = new Set(["32", "33", "36", "39", "40", "41", "42", "43", "44", "45"]);

export const CANADA_AREA_CODES = [
  "416", "647", "437", "905", "289", "365", "249",
  "519", "226", "548", "613", "343", "705", "807",
  "514", "438", "450", "579", "418", "367", "819", "873",
  "604", "778", "236", "250", "672",
  "403", "587", "825", "780",
  "204", "431",
  "306", "639",
  "902", "782",
  "506",
  "709",
] as const;

const CANADA_AREA_SET = new Set<string>(CANADA_AREA_CODES);

const DO_AREA = new Set(["809", "829", "849"]);

export function digitsOnly(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

/** 10 chiffres nationaux NANP (sans le 1 pays), ou null. */
export function nanpNational10(d: string): string | null {
  let x = digitsOnly(d);
  if (x.length === 11 && x.startsWith("1")) x = x.slice(1);
  if (x.length === 10) return x;
  return null;
}

export function isDominicanRepublicNanpDigits(d: string): boolean {
  const n = nanpNational10(d);
  return n !== null && DO_AREA.has(n.slice(0, 3));
}

export function isCanadaNanpDigits(d: string): boolean {
  const n = nanpNational10(d);
  return n !== null && CANADA_AREA_SET.has(n.slice(0, 3));
}

/** Priorité : DO → CA → US (PR / autres codes US restent US). */
export function inferNanpIsoFromNational10(nat10: string): "DO" | "CA" | "US" {
  const ac = nat10.slice(0, 3);
  if (DO_AREA.has(ac)) return "DO";
  if (CANADA_AREA_SET.has(ac)) return "CA";
  return "US";
}

export function inferNanpIsoFromFullDigits(d: string): "DO" | "CA" | "US" {
  const x = digitsOnly(d);
  if (x.length < 10) return "US";
  const with1 = x.length === 11 && x.startsWith("1") ? x.slice(1) : x.length === 10 ? x : null;
  if (!with1 || with1.length !== 10) return "US";
  return inferNanpIsoFromNational10(with1);
}

// ============================================
// HAITI — détection locale (préfixes 2 chiffres)
// ============================================
export function detectHaiti(localNumber8: string): OperatorResult | null {
  if (localNumber8.length !== 8) return null;
  const prefix2 = localNumber8.slice(0, 2);

  if (DIGICEL_HT_2.has(prefix2)) {
    return {
      operatorId: 173,
      operatorName: "Digicel Haiti",
      countryCode: "HT",
      countryName: "Haïti",
      flag: "🇭🇹",
      color: "#FF0000",
      confidence: "high",
      useReloadly: false,
    };
  }
  if (NATCOM_HT_2.has(prefix2)) {
    return {
      operatorId: 528,
      operatorName: "Natcom Haiti",
      countryCode: "HT",
      countryName: "Haïti",
      flag: "🇭🇹",
      color: "#003087",
      confidence: "high",
      useReloadly: false,
    };
  }
  return null;
}

export type LocalDetectOutcome = {
  shouldUseReloadly: boolean;
  countryOverride?: string;
  localResult?: OperatorResult | null;
  /** Numéro haïtien 8 chiffres mais préfixe inconnu */
  unknownHaitiPrefix?: boolean;
};

/**
 * `selectedCountry` = code ISO choisi dans le formulaire.
 * Retourne un résultat local pour HT, ou un `countryOverride` pour Reloadly (DO/CA) quand le numéro +1 l’impose.
 */
export function detectOperatorLocally(phone: string, selectedCountry: string): LocalDetectOutcome {
  const clean = digitsOnly(phone);
  const sel = String(selectedCountry || "").toUpperCase().slice(0, 2);

  if (sel === "HT" || clean.startsWith("509")) {
    const localNum = clean.startsWith("509") ? clean.slice(3) : clean.replace(/^0+/, "") || clean;
    if (localNum.length !== 8) {
      return { shouldUseReloadly: false, localResult: null };
    }
    const result = detectHaiti(localNum);
    if (result) return { shouldUseReloadly: false, localResult: result };
    return { shouldUseReloadly: false, localResult: null, unknownHaitiPrefix: true };
  }

  if (isDominicanRepublicNanpDigits(clean)) {
    return { shouldUseReloadly: true, countryOverride: "DO" };
  }

  if (isCanadaNanpDigits(clean)) {
    return { shouldUseReloadly: true, countryOverride: "CA" };
  }

  return { shouldUseReloadly: true };
}

/** Pays ISO à envoyer à Reloadly après règles NANP (sélection utilisateur sinon). */
export function effectiveCountryForReloadly(phone: string, selectedCountry: string): string {
  const local = detectOperatorLocally(phone, selectedCountry);
  if (local.countryOverride) return local.countryOverride;
  return String(selectedCountry || "").toUpperCase().slice(0, 2);
}

// ============================================
// Validation longueur (national)
// ============================================
export type PhoneRule = { length: number[]; example: string; format: string };

export const PHONE_RULES: Partial<Record<string, PhoneRule>> = {
  HT: { length: [8], example: "34 12 34 56", format: "XX XX XX XX" },
  US: { length: [10], example: "212 345 6789", format: "XXX XXX XXXX" },
  CA: { length: [10], example: "514 345 6789", format: "XXX XXX XXXX" },
  FR: { length: [9], example: "6 12 34 56 78", format: "X XX XX XX XX" },
  DO: { length: [10], example: "809 234 5678", format: "XXX XXX XXXX" },
  PR: { length: [10], example: "787 234 5678", format: "XXX XXX XXXX" },
  BR: { length: [10, 11], example: "11 9 1234 5678", format: "XX X XXXX XXXX" },
  MX: { length: [10], example: "55 1234 5678", format: "XX XXXX XXXX" },
  GB: { length: [10], example: "7911 123456", format: "XXXX XXXXXX" },
  ES: { length: [9], example: "612 345 678", format: "XXX XXX XXX" },
  NG: { length: [10], example: "801 234 5678", format: "XXX XXX XXXX" },
  JM: { length: [10], example: "876 234 5678", format: "XXX XXX XXXX" },
  TT: { length: [10], example: "868 234 5678", format: "XXX XXX XXXX" },
};

/** Chiffres « nationaux » pour la validation (sans indicatif). */
export function nationalDigitsForValidation(phone: string, countryCode: string): string {
  const d = digitsOnly(phone);
  const cc = String(countryCode || "").toUpperCase().slice(0, 2);

  if (cc === "HT") {
    return d.startsWith("509") ? d.slice(3) : d.replace(/^0+/, "") || d;
  }

  if (cc === "FR") {
    let x = d;
    if (x.startsWith("33")) x = x.slice(2);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "ES") {
    let x = d;
    if (x.startsWith("34")) x = x.slice(2);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "GB") {
    let x = d;
    if (x.startsWith("44")) x = x.slice(2);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "BR") {
    let x = d;
    if (x.startsWith("55")) x = x.slice(2);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "MX") {
    let x = d;
    if (x.startsWith("52")) x = x.slice(2);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "NG") {
    let x = d;
    if (x.startsWith("234")) x = x.slice(3);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "JM") {
    let x = d;
    if (x.startsWith("1876")) x = x.slice(4);
    else if (x.startsWith("876")) x = x.slice(3);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "TT") {
    let x = d;
    if (x.startsWith("1868")) x = x.slice(4);
    else if (x.startsWith("868")) x = x.slice(3);
    return x.replace(/^0+/, "") || x;
  }

  if (cc === "US" || cc === "CA" || cc === "DO" || cc === "PR") {
    let x = d;
    if (x.startsWith("1") && x.length >= 11) x = x.slice(1);
    if (x.length === 11 && x.startsWith("1")) x = x.slice(1);
    return x.replace(/^0+/, "") || x;
  }

  return d.replace(/^0+/, "") || d;
}

export type PhoneValidationResult = {
  valid: boolean;
  /** Encore en train de taper (longueur < min requis) */
  partial?: boolean;
  error?: string;
  type?: "INVALID_PHONE";
};

export function validatePhone(phone: string, countryCode: string): PhoneValidationResult {
  const cc = String(countryCode || "").toUpperCase().slice(0, 2);
  const local = nationalDigitsForValidation(phone, cc);
  const rules = PHONE_RULES[cc];

  if (!rules) {
    if (local.length === 0) return { valid: true, partial: true };
    if (local.length < 6) return { valid: false, partial: true };
    if (local.length > 15) return { valid: false, error: "INVALID_LENGTH", type: "INVALID_PHONE" };
    return { valid: true };
  }

  const minL = Math.min(...rules.length);
  const maxL = Math.max(...rules.length);

  if (local.length === 0) return { valid: true, partial: true };
  if (local.length < minL) return { valid: false, partial: true };
  if (local.length > maxL) {
    return {
      valid: false,
      error: "INVALID_LENGTH",
      type: "INVALID_PHONE",
    };
  }
  if (!rules.length.includes(local.length)) {
    return { valid: false, error: "INVALID_LENGTH", type: "INVALID_PHONE" };
  }
  return { valid: true };
}

/** Pays / indicatifs pour le sélecteur « Autres pays » (recharge internationale). */

export type RechargeCountry = { code: string; flag: string; dial: string; name: string };

export const RECHARGE_COUNTRIES: RechargeCountry[] = [
  { code: "HT", flag: "🇭🇹", dial: "+509", name: "Haiti" },
  { code: "US", flag: "🇺🇸", dial: "+1", name: "United States" },
  { code: "CA", flag: "🇨🇦", dial: "+1", name: "Canada" },
  { code: "DO", flag: "🇩🇴", dial: "+1", name: "Dominican Republic" },
  { code: "PR", flag: "🇵🇷", dial: "+1", name: "Puerto Rico" },
  { code: "JM", flag: "🇯🇲", dial: "+1876", name: "Jamaica" },
  { code: "TT", flag: "🇹🇹", dial: "+1868", name: "Trinidad & Tobago" },
  { code: "FR", flag: "🇫🇷", dial: "+33", name: "France" },
  { code: "GP", flag: "🇬🇵", dial: "+590", name: "Guadeloupe" },
  { code: "MQ", flag: "🇲🇶", dial: "+596", name: "Martinique" },
  { code: "GF", flag: "🇬🇫", dial: "+594", name: "Guyane" },
  { code: "BE", flag: "🇧🇪", dial: "+32", name: "Belgium" },
  { code: "CH", flag: "🇨🇭", dial: "+41", name: "Switzerland" },
  { code: "GB", flag: "🇬🇧", dial: "+44", name: "United Kingdom" },
  { code: "ES", flag: "🇪🇸", dial: "+34", name: "Spain" },
  { code: "IT", flag: "🇮🇹", dial: "+39", name: "Italy" },
  { code: "DE", flag: "🇩🇪", dial: "+49", name: "Germany" },
  { code: "NL", flag: "🇳🇱", dial: "+31", name: "Netherlands" },
  { code: "PT", flag: "🇵🇹", dial: "+351", name: "Portugal" },
  { code: "BR", flag: "🇧🇷", dial: "+55", name: "Brazil" },
  { code: "MX", flag: "🇲🇽", dial: "+52", name: "Mexico" },
  { code: "CO", flag: "🇨🇴", dial: "+57", name: "Colombia" },
  { code: "EC", flag: "🇪🇨", dial: "+593", name: "Ecuador" },
  { code: "PE", flag: "🇵🇪", dial: "+51", name: "Peru" },
  { code: "CL", flag: "🇨🇱", dial: "+56", name: "Chile" },
  { code: "AR", flag: "🇦🇷", dial: "+54", name: "Argentina" },
  { code: "SN", flag: "🇸🇳", dial: "+221", name: "Senegal" },
  { code: "CI", flag: "🇨🇮", dial: "+225", name: "Côte d'Ivoire" },
  { code: "ML", flag: "🇲🇱", dial: "+223", name: "Mali" },
  { code: "CM", flag: "🇨🇲", dial: "+237", name: "Cameroon" },
  { code: "NE", flag: "🇳🇪", dial: "+227", name: "Niger" },
  { code: "NG", flag: "🇳🇬", dial: "+234", name: "Nigeria" },
  { code: "GA", flag: "🇬🇦", dial: "+241", name: "Gabon" },
  { code: "CD", flag: "🇨🇩", dial: "+243", name: "DR Congo" },
  { code: "CG", flag: "🇨🇬", dial: "+242", name: "Congo" },
  { code: "KE", flag: "🇰🇪", dial: "+254", name: "Kenya" },
  { code: "TZ", flag: "🇹🇿", dial: "+255", name: "Tanzania" },
  { code: "UG", flag: "🇺🇬", dial: "+256", name: "Uganda" },
  { code: "ZA", flag: "🇿🇦", dial: "+27", name: "South Africa" },
  { code: "MA", flag: "🇲🇦", dial: "+212", name: "Morocco" },
  { code: "TN", flag: "🇹🇳", dial: "+216", name: "Tunisia" },
  { code: "DZ", flag: "🇩🇿", dial: "+213", name: "Algeria" },
  { code: "IN", flag: "🇮🇳", dial: "+91", name: "India" },
  { code: "PH", flag: "🇵🇭", dial: "+63", name: "Philippines" },
  { code: "BD", flag: "🇧🇩", dial: "+880", name: "Bangladesh" },
  { code: "PK", flag: "🇵🇰", dial: "+92", name: "Pakistan" },
];

export function countryByCode(code: string): RechargeCountry | undefined {
  return RECHARGE_COUNTRIES.find((c) => c.code === String(code || "").toUpperCase().slice(0, 2));
}

/** Indicatif affichage (ex. +33). */
export function dialForCountry(code: string): string {
  return countryByCode(code)?.dial ?? "+";
}

/**
 * Devine pays + numéro national à partir du champ (E.164 `+…`, `00…`, ou `509…` pour Haïti).
 * Pour `+1` (NANP), le premier pays listé avec indicatif +1 (US) l’emporte — fine zone impossible sans base NANP.
 */
export function inferCountryAndNational(raw: string): { country: RechargeCountry; nationalDigits: string } | null {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;

  let d = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) d = d.slice(2);
  if (!d) return null;

  const sorted = RECHARGE_COUNTRIES.map((c, index) => ({
    c,
    index,
    dialDigits: c.dial.replace(/\D/g, ""),
  })).sort((a, b) => b.dialDigits.length - a.dialDigits.length || a.index - b.index);

  for (const { c, dialDigits } of sorted) {
    if (!dialDigits) continue;
    if (d.startsWith(dialDigits)) {
      if (dialDigits === "1" && d.length < 11) continue;
      const nat = d.slice(dialDigits.length).replace(/^0+/, "") || "";
      return { country: c, nationalDigits: nat };
    }
  }

  const ht = countryByCode("HT");
  if (ht && d.startsWith("509") && d.length >= 11) {
    return { country: ht, nationalDigits: d.slice(3).replace(/^0+/, "") || d.slice(3) };
  }

  return null;
}

/** Indique si on peut mettre à jour le pays automatiquement (évite d’écraser un pays choisi pour un numéro local sans +). */
export function shouldAutoPickCountryFromPhone(raw: string): boolean {
  const t = String(raw || "").trim();
  if (!t) return false;
  if (t.startsWith("+") || t.startsWith("00")) return true;
  const d = t.replace(/\D/g, "");
  return d.startsWith("509") && d.length >= 11;
}

/** Chiffres nationaux sans indicatif pays (simplifié pour Reloadly auto-detect). */
export function nationalDigits(phone: string, dial: string): string {
  let d = String(phone || "").replace(/\D/g, "");
  const dialDigits = dial.replace(/\D/g, "");
  if (dialDigits && d.startsWith(dialDigits)) d = d.slice(dialDigits.length);
  if (d.startsWith("0")) d = d.replace(/^0+/, "") || d;
  if (dial === "+1" && d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d;
}

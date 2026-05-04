export interface MarkupConfig {
  enabled: boolean;
  /** e.g. 7 = 7% — prélevé sur le montant total payé par le client (markup inclusif). */
  percentage: number;
  /** e.g. 0.30 = minimum $0.30 prélevé sur le paiement client */
  minFlatFee: number;
}

/**
 * Markup **inclusif** : `customerPaysUsd` est le total encaissé (ce que le client paie, ex. 10 $).
 * On prélève `max(% × total, frais min)` sur ce montant ; le **reste** est le nominal Reloadly (crédit envoyé).
 *
 * @returns
 * - `finalPrice` = total client (= entrée, arrondi 2 déc.)
 * - `markupAmount` = part gardée (marge sur la transaction)
 * - `costPrice` = montant nominal à envoyer à Reloadly (après retrait)
 */
export function calculateFinalPrice(
  customerPaysUsd: number,
  config: MarkupConfig,
): {
  costPrice: number;
  markupAmount: number;
  finalPrice: number;
  profitMargin: number;
} {
  if (!Number.isFinite(customerPaysUsd) || customerPaysUsd <= 0) {
    return { costPrice: 0, markupAmount: 0, finalPrice: 0, profitMargin: 0 };
  }
  const finalPrice = Math.round(customerPaysUsd * 100) / 100;
  if (!config.enabled) {
    return {
      costPrice: finalPrice,
      markupAmount: 0,
      finalPrice,
      profitMargin: 0,
    };
  }
  const pctPart = finalPrice * (config.percentage / 100);
  const minFee = Number.isFinite(config.minFlatFee) && config.minFlatFee > 0 ? config.minFlatFee : 0;
  let markupAmount = Math.round(Math.max(pctPart, minFee) * 100) / 100;
  /** Garde au moins 0,01 $ pour le nominal Reloadly. */
  const maxMarkup = Math.max(0, finalPrice - 0.01);
  markupAmount = Math.min(markupAmount, maxMarkup);
  const costPrice = Math.round((finalPrice - markupAmount) * 100) / 100;
  const profitMargin = finalPrice > 0 ? (markupAmount / finalPrice) * 100 : 0;
  return {
    costPrice,
    markupAmount,
    finalPrice,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}

export const DEFAULT_MARKUP_CONFIG: MarkupConfig = {
  enabled: false,
  percentage: 7,
  minFlatFee: 0.3,
};

export function normalizeMarkupConfig(raw: unknown): MarkupConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MARKUP_CONFIG };
  const o = raw as Record<string, unknown>;
  const enabled = Boolean(o.enabled);
  const p = Number(o.percentage);
  const m = Number(o.minFlatFee);
  return {
    enabled,
    percentage: Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : DEFAULT_MARKUP_CONFIG.percentage,
    minFlatFee: Number.isFinite(m) && m >= 0 ? Math.min(50, m) : DEFAULT_MARKUP_CONFIG.minFlatFee,
  };
}

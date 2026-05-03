/** Paramètres caisse / ZHONGJI (localStorage — à relier plus tard à un admin distant). */

const KEY_AUTO_PRINT = "monican_caisse_auto_print";
const KEY_CASHIER = "monican_caisse_name";

export function getAutoPrintReceipt(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_AUTO_PRINT) === "1";
}

export function setAutoPrintReceipt(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_AUTO_PRINT, on ? "1" : "0");
}

export function getCashierName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_CASHIER) || "";
}

export function setCashierName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_CASHIER, name.trim());
}

export function paymentLabel(method: "stripe" | "moncash" | "cash", lang: "en" | "fr" | "es" | "kr"): string {
  if (method === "cash") {
    if (lang === "fr") return "Cash";
    if (lang === "kr") return "Lajan kach";
    if (lang === "es") return "Efectivo";
    return "Cash";
  }
  if (method === "moncash") return "Moncash";
  if (lang === "fr") return "Kat / Card (Stripe)";
  if (lang === "kr") return "Kat Strip";
  if (lang === "es") return "Tarjeta (Stripe)";
  return "Card (Stripe)";
}

/**
 * Ouvrir tiroir-caisse (ZHONGJI / ESC-POS) quand paiement cash est choisi.
 * Fait au mieux:
 * 1) Web Serial (si navigateur/permission supporté)
 * 2) Fallback commande d'impression (window.print) pour appareils liés à l’imprimante thermique
 */
export async function tryOpenCashDrawer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const nav = navigator as Navigator & {
      serial?: {
        requestPort: () => Promise<{
          open: (opts: { baudRate: number }) => Promise<void>;
          writable?: {
            getWriter: () => { write: (v: Uint8Array) => Promise<void>; releaseLock: () => void };
          };
          close: () => Promise<void>;
        }>;
      };
    };
    if (nav.serial?.requestPort) {
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable?.getWriter();
      if (writer) {
        // ESC p m t1 t2 -> pulse tiroir
        await writer.write(new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]));
        writer.releaseLock();
      }
      await port.close();
      return true;
    }
  } catch {
    // Ignore et fallback print.
  }
  try {
    window.print();
    return true;
  } catch {
    return false;
  }
}

/** Affichage type +509 34XX XXXX (resè piblik / ajan — vi prive). */
export function maskRecipientForReceipt(dial: string, nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, "");
  const prefix = dial.trim() || "+509";
  if (d.length < 4) return `${prefix} ${d}`;
  return `${prefix} ${d.slice(0, 2)}XX XXXX`;
}

/** Nimewo konplè, espas chak 2 chif (apre prefiks peyi) — resè kèsye sèlman. */
export function formatRecipientForReceipt(dial: string, nationalDigits: string): string {
  let d = nationalDigits.replace(/\D/g, "");
  let prefix = dial.trim().replace(/\s/g, "") || "+509";
  if (!prefix.startsWith("+")) prefix = `+${prefix.replace(/^\+/, "")}`;
  if (!d) return prefix;
  const ccDigits = prefix.replace(/\D/g, "");
  if (ccDigits.length > 0 && d.startsWith(ccDigits) && d.length > ccDigits.length) {
    d = d.slice(ccDigits.length);
  }
  if (!d) return prefix;
  const grouped = d.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return `${prefix} ${grouped}`;
}

export function monicanDisplayId(reference: string, year = new Date().getFullYear()): string {
  const tail = (reference || "XXXX").replace(/^MR-/i, "").slice(0, 8).toUpperCase() || "XXXXXXXX";
  return `MON-${year}-${tail}`;
}

export type ReceiptVariant = "caisse" | "ajan";

export type ReceiptWhatsAppPayload = {
  dateStr: string;
  timeStr: string;
  phoneDisplay: string;
  operator: string;
  amountUsd: string;
  htgApprox: string;
  paymentLabel: string;
  txId: string;
};

export function buildWhatsAppReceiptMessage(p: ReceiptWhatsAppPayload, variant: ReceiptVariant = "caisse"): string {
  const base = `✅ *MONICAN RECHARGE*
recharge.monican.shop

📅 ${p.dateStr} — ${p.timeStr}
━━━━━━━━━━━━━━━━
📱 Destinataire: ${p.phoneDisplay}
📡 Operateur: ${p.operator}
💰 Montant: $${p.amountUsd}
🇭🇹 Equivalent: ~HTG ${p.htgApprox}
━━━━━━━━━━━━━━━━
💳 Paiement: ${p.paymentLabel}
🔑 ID: ${p.txId}
━━━━━━━━━━━━━━━━
✅ Transaction réussie!
Merci pour votre confiance.

🛍️ monican.shop`;
  if (variant === "ajan") {
    return `${base}`;
  }
  return `${base}
📞 717-880-1479`;
}

export function digitsForWhatsApp(dial: string, nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, "");
  if (dial.includes("509") || dial.replace(/\D/g, "").endsWith("509")) {
    return d.startsWith("509") ? d : `509${d}`;
  }
  const dialDigits = dial.replace(/\D/g, "");
  return `${dialDigits}${d}`.replace(/^\+/, "");
}

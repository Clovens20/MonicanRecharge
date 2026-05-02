"use client";

import type { TxLocal } from "@/lib/store";
import { formatCurrency, formatHTG } from "@/lib/utils";
import { monicanDisplayId, maskRecipientForReceipt, paymentLabel, type ReceiptVariant } from "@/lib/receipt/caisse";
import type { Lang } from "@/lib/i18n/translations";

export type ThermalReceiptProps = {
  tx: TxLocal;
  dial: string;
  nationalDigits: string;
  cashierName: string;
  lang: Lang;
  /** `ajan` : resè revandè, san nimewo sipò Monican, etikèt « Ajan » olye de « Caissier ». */
  variant?: ReceiptVariant;
};

export function ThermalReceipt({ tx, dial, nationalDigits, cashierName, lang, variant = "caisse" }: ThermalReceiptProps) {
  const created = new Date(tx.created_at);
  const dateStr = created.toLocaleDateString(lang === "kr" ? "fr-FR" : lang, { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = created.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const masked = maskRecipientForReceipt(dial, nationalDigits);
  const monId = monicanDisplayId(tx.reference);
  const pay = paymentLabel(tx.payment_method, lang);
  const fx = tx.amount_usd > 0 ? tx.amount_local / tx.amount_usd : 132;

  return (
    <div
      id="receipt"
      className="thermal-receipt-screen mx-auto w-full max-w-[80mm] border border-black/10 bg-white p-4 text-left font-mono text-[12px] leading-snug text-black print:border-0 print:p-2 print:shadow-none"
      data-testid="thermal-receipt"
    >
      <div className="text-center font-bold uppercase tracking-wide">MONICAN</div>
      <div className="text-center text-[11px] font-semibold uppercase tracking-wider">
        {variant === "ajan" ? "RECHARGE — AJAN" : "RECHARGE"}
      </div>
      <div className="text-center text-[10px] text-black/60">recharge.monican.shop</div>
      <div className="my-2 border-t border-dashed border-black/40" />
      <div>Date: {dateStr}</div>
      <div>Heure: {timeStr}</div>
      <div>
        {variant === "ajan" ? "Ajan" : "Caissier"}: {cashierName || "—"}
      </div>
      <div>ID: {monId}</div>
      <div className="my-2 border-t border-dashed border-black/40" />
      <div className="font-bold uppercase">Destinataire</div>
      <div>{masked}</div>
      <div>{tx.flag} {tx.operator}</div>
      <div className="my-2 border-t border-dashed border-black/40" />
      <div>
        MONTANT: {formatCurrency(tx.amount_usd)}
      </div>
      <div>
        EQUIVALENT: ~HTG {formatHTG(tx.amount_usd, fx)} {tx.currency}
      </div>
      <div className="my-2 border-t border-dashed border-black/40" />
      <div>PAIEMENT: {pay}</div>
      <div className="my-2 border-t border-dashed border-black/40" />
      <div className="text-center font-bold">✅ TRANSACTION OK</div>
      <div className="my-2 border-t border-dashed border-black/40" />
      <div className="text-center text-[10px] text-black/70">Merci / Mèsi / Thanks</div>
      {variant === "caisse" ? (
        <div className="text-center text-[10px]">WhatsApp: 717-880-1479</div>
      ) : null}
      <div className="text-center text-[10px]">monican.shop</div>
    </div>
  );
}

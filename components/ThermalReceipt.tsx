"use client";

import type { TxLocal } from "@/lib/store";
import { formatCurrency, formatHTG } from "@/lib/utils";
import {
  formatRecipientForReceipt,
  monicanDisplayId,
  maskRecipientForReceipt,
  paymentLabel,
  type ReceiptVariant,
} from "@/lib/receipt/caisse";
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
  const phoneLine =
    variant === "caisse" ? formatRecipientForReceipt(dial, nationalDigits) : maskRecipientForReceipt(dial, nationalDigits);
  const monId = monicanDisplayId(tx.reference);
  const pay = paymentLabel(tx.payment_method, lang);
  const fx = tx.amount_usd > 0 ? tx.amount_local / tx.amount_usd : 132;
  const thermalPrintStyle = `
  @media print {
    #receipt, #receipt * {
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
      text-shadow: 0 0 0.4px #000000 !important;
      -webkit-font-smoothing: none !important;
      border-color: #000000 !important;
      opacity: 1 !important;
    }
    #receipt {
      font-weight: 900 !important;
      filter: contrast(1.4) !important;
    }
    @page {
      size: 80mm auto;
      margin: 0;
    }
  }
`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: thermalPrintStyle }} />
      <div
        id="receipt"
        className="thermal-receipt-screen mx-auto w-full max-w-[80mm] border border-black/10 bg-white p-4 text-left font-mono text-[12px] leading-snug text-black print:w-[72mm] print:max-w-[72mm] print:border-0 print:p-[1mm] print:text-[12px] print:leading-[1.35] print:shadow-none print:font-bold"
        data-testid="thermal-receipt"
      >
        <div className="text-center font-bold uppercase tracking-wide print:text-[15px] print:font-black">MONICAN</div>
        <div className="text-center text-[11px] font-semibold uppercase tracking-wider print:text-[12px] print:font-bold">
          {variant === "ajan" ? "RECHARGE — AJAN" : "RECHARGE"}
        </div>
        <div className="text-center text-[10px] text-black/60 print:text-black print:font-bold">recharge.monican.shop</div>
        <div className="my-2 border-t border-dashed border-black/40 print:border-black" />
        <div>Date: {dateStr}</div>
        <div>Heure: {timeStr}</div>
        <div>
          {variant === "ajan" ? "Ajan" : "Caissier"}: {cashierName || "—"}
        </div>
        <div>ID: {monId}</div>
        <div className="my-2 border-t border-dashed border-black/40 print:border-black" />
        <div className="font-bold uppercase">Destinataire</div>
        <div>{phoneLine}</div>
        <div>{tx.flag} {tx.operator}</div>
        <div className="my-2 border-t border-dashed border-black/40 print:border-black" />
        <div>
          MONTANT: {formatCurrency(tx.amount_usd)}
        </div>
        <div>
          EQUIVALENT: ~HTG {formatHTG(tx.amount_usd, fx)} {tx.currency}
        </div>
        <div className="my-2 border-t border-dashed border-black/40 print:border-black" />
        <div>PAIEMENT: {pay}</div>
        <div className="my-2 border-t border-dashed border-black/40 print:border-black" />
        <div className="text-center font-bold">** TRANSACTION OK **</div>
        <div className="my-2 border-t border-dashed border-black/40 print:border-black" />
        <div className="text-center text-[10px] text-black/70 print:text-black print:font-bold">Merci / Mèsi / Thanks</div>
        {variant === "caisse" ? (
          <div className="text-center text-[10px]">WhatsApp: 717-880-1479</div>
        ) : null}
        <div className="text-center text-[10px]">monican.shop</div>
      </div>
    </>
  );
}

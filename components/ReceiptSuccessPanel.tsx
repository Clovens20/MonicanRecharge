"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Printer, WhatsappLogo, EnvelopeSimple, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n/LanguageProvider";
import type { TxLocal } from "@/lib/store";
import { ThermalReceipt } from "@/components/ThermalReceipt";
import {
  buildWhatsAppReceiptMessage,
  digitsForWhatsApp,
  getAutoPrintReceipt,
  monicanDisplayId,
  maskRecipientForReceipt,
  paymentLabel,
  type ReceiptWhatsAppPayload,
} from "@/lib/receipt/caisse";
import { formatHTG } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  tx: TxLocal;
  dial: string;
  nationalDigits: string;
  cashierName: string;
  onSkip: () => void;
};

export function ReceiptSuccessPanel({ tx, dial, nationalDigits, cashierName, onSkip }: Props) {
  const { t, lang } = useLang();
  const [waOpen, setWaOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [waDigits, setWaDigits] = useState(() => digitsForWhatsApp(dial, nationalDigits));
  const [emailTo, setEmailTo] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);

  useEffect(() => {
    if (!getAutoPrintReceipt()) return;
    const id = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(id);
  }, [tx.id]);

  function handlePrint() {
    window.print();
  }

  async function sendWhatsAppDirect() {
    const created = new Date(tx.created_at);
    const dateStr = created.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = created.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const fx = tx.amount_usd > 0 ? tx.amount_local / tx.amount_usd : 132;
    const payload: ReceiptWhatsAppPayload = {
      dateStr,
      timeStr,
      phoneDisplay: maskRecipientForReceipt(dial, nationalDigits),
      operator: tx.operator,
      amountUsd: tx.amount_usd.toFixed(2),
      htgApprox: formatHTG(tx.amount_usd, fx),
      paymentLabel: paymentLabel(tx.payment_method, lang),
      txId: monicanDisplayId(tx.reference),
    };
    const text = encodeURIComponent(buildWhatsAppReceiptMessage(payload));
    const n = waDigits.replace(/\D/g, "");
    if (n.length < 8) {
      toast.error(t("receipt.wa_invalid"));
      return;
    }
    setSendingWa(true);
    try {
      const res = await fetch("/api/receipt/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: n,
          text: decodeURIComponent(text),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("receipt.wa_fail"));
      toast.success(t("receipt.wa_sent"));
      setWaOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("receipt.wa_fail"));
    } finally {
      setSendingWa(false);
    }
  }

  async function sendEmail() {
    const to = emailTo.trim();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error(t("receipt.email_invalid"));
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch("/api/receipt/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          reference: tx.reference,
          operator: tx.operator,
          recipient: `${dial} ${nationalDigits}`,
          amountUsd: tx.amount_usd,
          amountLocal: tx.amount_local,
          currency: tx.currency,
          paymentMethod: tx.payment_method,
          createdAt: tx.created_at,
          cashierName: cashierName || "—",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("receipt.email_fail"));
      toast.success(t("receipt.email_sent"));
      setEmailOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("receipt.email_fail"));
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <motion.div
      key="receipt-step"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
      data-testid="receipt-success-panel"
    >
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">{t("receipt.badge")}</div>
        <h3 className="font-display mt-1 text-2xl font-bold tracking-tight text-brand-ink">{t("receipt.title")}</h3>
        <p className="mt-1 text-sm text-black/55">{t("receipt.subtitle")}</p>
      </div>

      <ThermalReceipt tx={tx} dial={dial} nationalDigits={nationalDigits} cashierName={cashierName} lang={lang} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" className="h-12 justify-start gap-2 border-black/15" onClick={handlePrint} data-testid="receipt-print">
          <Printer className="h-5 w-5" weight="duotone" />
          {t("receipt.btn_print")}
        </Button>
        <Button type="button" variant="outline" className="h-12 justify-start gap-2 border-black/15" onClick={() => setWaOpen(true)} data-testid="receipt-whatsapp">
          <WhatsappLogo className="h-5 w-5" weight="duotone" />
          {t("receipt.btn_whatsapp")}
        </Button>
        <Button type="button" variant="outline" className="h-12 justify-start gap-2 border-black/15" onClick={() => setEmailOpen(true)} data-testid="receipt-email">
          <EnvelopeSimple className="h-5 w-5" weight="duotone" />
          {t("receipt.btn_email")}
        </Button>
        <Button type="button" variant="ghost" className="h-12 justify-center text-black/50" onClick={onSkip} data-testid="receipt-skip">
          <X className="h-4 w-4" />
          {t("receipt.btn_skip")}
        </Button>
      </div>

      {waOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 print:hidden" role="dialog">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="font-display text-lg font-bold text-brand-ink">{t("receipt.wa_title")}</div>
            <p className="mt-1 text-sm text-black/55">{t("receipt.wa_hint")}</p>
            <Input className="mt-3 font-mono" value={waDigits} onChange={(e) => setWaDigits(e.target.value)} placeholder="509XXXXXXXX" />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setWaOpen(false)}>
                {t("btn.back")}
              </Button>
              <Button variant="green" className="flex-1" disabled={sendingWa} onClick={() => void sendWhatsAppDirect()}>
                {sendingWa ? "…" : t("receipt.wa_send")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {emailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 print:hidden" role="dialog">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-xl">
            <div className="font-display text-lg font-bold text-brand-ink">{t("receipt.email_title")}</div>
            <p className="mt-1 text-sm text-black/55">{t("receipt.email_hint")}</p>
            <Input
              className="mt-3"
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="kliyan@example.com"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEmailOpen(false)}>
                {t("btn.back")}
              </Button>
              <Button variant="green" className="flex-1" disabled={sendingEmail} onClick={sendEmail}>
                {sendingEmail ? "…" : t("receipt.email_send")}
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] uppercase tracking-[0.15em] text-black/40">{t("receipt.zhongji_hint")}</p>
    </motion.div>
  );
}

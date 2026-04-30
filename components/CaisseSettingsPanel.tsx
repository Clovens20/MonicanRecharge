"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { getAutoPrintReceipt, setAutoPrintReceipt, getCashierName, setCashierName } from "@/lib/receipt/caisse";
import { Button } from "@/components/ui/button";

/** Paramètres imprimante / nom caissier — affichés uniquement sur `/recharge` (session NIP). */
export function CaisseSettingsPanel() {
  const { t } = useLang();
  const [autoPrint, setAutoPrint] = useState(false);
  const [cashierInput, setCashierInput] = useState("");

  useEffect(() => {
    setAutoPrint(getAutoPrintReceipt());
    setCashierInput(getCashierName());
  }, []);

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 sm:p-6" data-testid="caisse-settings">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">— {t("caisse.title")}</div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/5 bg-brand-bg p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-emerald-600"
            checked={autoPrint}
            onChange={(e) => setAutoPrint(e.target.checked)}
          />
          <span className="text-sm font-medium text-brand-ink">{t("caisse.auto_print")}</span>
        </label>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-black/45">{t("caisse.cashier")}</div>
          <input
            value={cashierInput}
            onChange={(e) => setCashierInput(e.target.value)}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-emerald-100 focus:border-emerald-500 focus:ring-4"
            placeholder="Jean"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={() => {
          setAutoPrintReceipt(autoPrint);
          setCashierName(cashierInput);
          toast.success(t("caisse.saved"));
        }}
      >
        {t("caisse.save")}
      </Button>
      <p className="mt-3 text-xs leading-relaxed text-black/50">{t("caisse.note")}</p>
    </div>
  );
}

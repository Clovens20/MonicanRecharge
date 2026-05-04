"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { calculateFinalPrice, type MarkupConfig } from "@/lib/markup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminMarkupPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [percentage, setPercentage] = useState(7);
  const [minFlatFee, setMinFlatFee] = useState(0.3);
  const [sampleCost, setSampleCost] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/markup", { credentials: "include", cache: "no-store" });
      const j = (await r.json()) as { enabled?: boolean; percentage?: number; minFlatFee?: number; error?: string };
      if (!r.ok) throw new Error(j.error || "Erè");
      setEnabled(Boolean(j.enabled));
      if (typeof j.percentage === "number") setPercentage(j.percentage);
      if (typeof j.minFlatFee === "number") setMinFlatFee(j.minFlatFee);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erè chajman");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cfg: MarkupConfig = useMemo(
    () => ({
      enabled,
      percentage: Math.min(25, Math.max(0, percentage)),
      minFlatFee: Math.max(0, minFlatFee),
    }),
    [enabled, percentage, minFlatFee],
  );

  const preview = useMemo(() => {
    const cost = Number.isFinite(sampleCost) && sampleCost > 0 ? sampleCost : 0;
    return calculateFinalPrice(cost, cfg);
  }, [sampleCost, cfg]);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/markup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          percentage: Math.min(25, Math.max(0, percentage)),
          minFlatFee: Math.max(0, minFlatFee),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Erè");
      toast.success("Markup anrejistre.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erè");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#0A0E1A] p-6 text-white shadow-xl sm:p-8">
      <h1 className="font-display text-2xl font-black tracking-tight">Paramètres Markup &amp; Bénéfice</h1>
        <p className="mt-2 text-sm text-white/55">
          Markup <strong>inclusif</strong> : kliyan peye montant li chwazi a ; sou li nou retire % oswa frais min, rès la ale
          nan Reloadly. Kliyan pa wè pousantaj la.
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-white/45">Chajman…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-sm font-semibold">Activer le markup global</span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#00D084]"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              </label>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">Markup (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={25}
                    step={0.5}
                    className="mt-2 border-white/15 bg-white/5 text-white"
                    value={percentage}
                    onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/45">
                    Frais minimum par transaction ($)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.05}
                    className="mt-2 border-white/15 bg-white/5 text-white"
                    value={minFlatFee}
                    onChange={(e) => setMinFlatFee(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#00D084]">Calculatrice</h2>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-white/45">
                Montant exemple ($) — total payé par le client
              </label>
              <Input
                type="number"
                min={0.5}
                step={0.5}
                className="mt-2 max-w-xs border-white/15 bg-white/5 text-white"
                value={sampleCost}
                onChange={(e) => setSampleCost(parseFloat(e.target.value) || 0)}
              />
              <dl className="mt-6 space-y-2 font-mono text-sm">
                <div className="flex justify-between border-b border-white/10 py-2">
                  <dt className="text-white/55">Client paie (total)</dt>
                  <dd className="font-bold text-[#00D084]">${preview.finalPrice.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/10 py-2">
                  <dt className="text-white/55">Prélevé (marge)</dt>
                  <dd>${preview.markupAmount.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between border-b border-white/10 py-2">
                  <dt className="text-white/55">Nominal Reloadly (crédit envoyé)</dt>
                  <dd>${preview.costPrice.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-white/55">Part marge / total</dt>
                  <dd>
                    ${preview.markupAmount.toFixed(2)} ({preview.profitMargin.toFixed(1)}%)
                  </dd>
                </div>
              </dl>
            </section>

            <Button
              type="button"
              className="h-12 w-full rounded-2xl bg-[#00D084] text-base font-bold text-[#0A0E1A] hover:bg-emerald-400"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Anrejistre…" : "Sauvegarder"}
            </Button>
          </div>
        )}
    </div>
  );
}

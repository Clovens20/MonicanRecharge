"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { getTx, TxLocal } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { mergeRemoteAndLocalTx } from "@/lib/tx/mergeRemoteLocal";
import { formatCurrency } from "@/lib/utils";
import { MagnifyingGlass, DownloadSimple } from "@phosphor-icons/react";

type FilterKey = "all" | "siksè" | "annatant" | "echwe";

export default function HistoryPage() {
  const { t } = useLang();
  const [tx, setTx] = useState<TxLocal[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const local = getTx();
    const sb = createClient();
    if (!sb) {
      setTx(local);
      return;
    }
    const { data: u } = await sb.auth.getUser();
    if (!u.user) {
      setTx(local);
      return;
    }
    const r = await fetch("/api/me/tranzaksyon", { credentials: "include" });
    if (!r.ok) {
      setTx(local);
      return;
    }
    const j = (await r.json()) as { transactions?: TxLocal[] };
    const remote = Array.isArray(j.transactions) ? j.transactions : [];
    setTx(mergeRemoteAndLocalTx(remote, local));
  }, []);

  useEffect(() => {
    void load();
    const onStorage = () => void load();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const filtered = useMemo(() => {
    let list = tx;
    if (filter !== "all") list = list.filter((x) => x.status === filter);
    if (query) list = list.filter((x) => x.recipient.includes(query) || x.operator.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [tx, filter, query]);

  function exportCsv() {
    const rows = [
      ["Date", "Reference", "Operator", "Recipient", "Amount USD", "Status", "Type"],
      ...filtered.map((x) => [
        new Date(x.created_at).toISOString(),
        x.reference,
        x.operator,
        x.recipient,
        x.amount_usd.toString(),
        x.status,
        x.type,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monican-recharge-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("history.all") },
    { key: "siksè", label: t("history.success") },
    { key: "annatant", label: t("history.pending") },
    { key: "echwe", label: t("history.failed") },
  ];

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">— {t("nav.history")}</div>
            <h1 className="font-display mt-2 text-4xl font-black tracking-tight sm:text-5xl">{t("history.title")}</h1>
          </div>
          <Button data-testid="export-csv" variant="outline" onClick={exportCsv}>
            <DownloadSimple className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
            <Input
              data-testid="history-search"
              className="pl-11"
              placeholder={t("history.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1 rounded-full bg-black/5 p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                data-testid={`filter-${f.key}`}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all ${
                  filter === f.key ? "bg-white text-brand-ink shadow-sm" : "text-black/50 hover:text-brand-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-black/5 bg-white">
          {filtered.length === 0 ? (
            <div data-testid="history-empty" className="px-6 py-16 text-center text-sm text-black/50">
              {t("dash.empty_tx")}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 text-[10px] uppercase tracking-[0.18em] text-black/40">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Operator</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x) => (
                  <tr key={x.id} className="border-b border-black/5 hover:bg-brand-bg" data-testid={`row-${x.id}`}>
                    <td className="px-6 py-4 text-black/60">{new Date(x.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-display font-bold tracking-tight"><span className="mr-2">{x.flag}</span>{x.operator}</td>
                    <td className="px-6 py-4 font-mono">{x.recipient}</td>
                    <td className="px-6 py-4 text-xs uppercase tracking-[0.14em] text-black/60">{x.type === "airtime" ? t("form.airtime") : x.plan || t("form.data")}</td>
                    <td className="px-6 py-4 text-right font-display font-extrabold tracking-tight">{formatCurrency(x.amount_usd)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={x.status === "siksè" ? "green" : x.status === "annatant" ? "gold" : "red"}>
                        {x.status === "siksè" ? t("history.success") : x.status === "annatant" ? t("history.pending") : t("history.failed")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

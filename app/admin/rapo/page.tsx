"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Range = "day" | "week" | "month";

type Rep = {
  gross: number;
  costs: number;
  net: number;
  commissionAgents: number;
  netAfterCommissions: number;
};

export default function AdminReportsPage() {
  const [range, setRange] = useState<Range>("week");
  const [rep, setRep] = useState<Rep | null>(null);

  async function load() {
    const r = await fetch(`/api/admin/reports?range=${range}`);
    if (r.status === 401) return toast.error("Konekte");
    if (r.status === 403) return toast.error("Aksè refize");
    const d = await r.json();
    if (d.error) return toast.error(d.error);
    setRep(d);
  }

  useEffect(() => {
    load();
  }, [range]);

  async function emailReport() {
    const r = await fetch("/api/admin/reports/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ range }),
    });
    if (!r.ok) return toast.error("Erè");
    toast.success("Imèl voye bay admin");
  }

  return (
    <div id="admin-rapo-print">
      <h1 className="font-display text-2xl font-black text-brand-ink">Rapò finansye</h1>
      <p className="mt-1 text-sm text-black/55">PnL — jounen / semèn / mwa.</p>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {(["day", "week", "month"] as const).map((r) => (
          <Button key={r} size="sm" variant={range === r ? "green" : "outline"} onClick={() => setRange(r)}>
            {r === "day" ? "Jounen" : r === "week" ? "Semèn" : "Mwa"}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={load}>
          Rafrechi
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          PDF (enprime)
        </Button>
        <Button size="sm" variant="outline" onClick={emailReport}>
          Voye imèl rapò
        </Button>
      </div>

      {rep && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card t="Revni brit" v={formatCurrency(rep.gross)} />
          <Card t="Kò Reloadly" v={formatCurrency(rep.costs)} />
          <Card t="Pwofi net" v={formatCurrency(rep.net)} />
          <Card t="Komisyon ajan" v={formatCurrency(rep.commissionAgents)} />
          <Card t="Net apre komisyon" v={formatCurrency(rep.netAfterCommissions)} highlight />
        </div>
      )}
    </div>
  );
}

function Card({ t, v, highlight }: { t: string; v: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${highlight ? "border-emerald-300 bg-emerald-50" : "border-black/5 bg-white"}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-black/45">{t}</div>
      <div className="font-display mt-1 text-2xl font-black text-brand-ink">{v}</div>
    </div>
  );
}

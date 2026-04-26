"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type D = {
  balance: number;
  minAlert: number;
  low: boolean;
  lastRecharge: string | null;
  reloadlyUrl: string;
};

export function ReloadlyAdminStrip() {
  const [d, setD] = useState<D | null>(null);
  const [minInput, setMinInput] = useState("");

  async function load() {
    const r = await fetch("/api/admin/reloadly-settings");
    if (r.status === 401 || r.status === 403) return;
    const j = await r.json();
    if (!j.error) {
      setD(j);
      setMinInput(String(j.minAlert ?? ""));
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  async function saveMin() {
    const v = parseFloat(minInput);
    if (!Number.isFinite(v) || v <= 0) return toast.error("Montan envalid");
    const r = await fetch("/api/admin/reloadly-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minAlert: v }),
    });
    if (!r.ok) return toast.error("Pa ka sove");
    toast.success("Seuil mete ajou");
    load();
  }

  async function markRecharge() {
    const r = await fetch("/api/admin/reloadly-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markDernyeRecharge: true }),
    });
    if (!r.ok) return toast.error("Erè");
    toast.success("Dat dènyè recharge anrejistre");
    load();
  }

  if (!d) return null;

  return (
    <div
      className={`border-b px-4 py-2 text-sm ${
        d.low ? "border-red-200 bg-red-50 text-red-950" : "border-black/5 bg-emerald-50/80 text-brand-ink"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 md:pl-56">
        <span className="font-semibold">Reloadly</span>
        <span>{formatCurrency(d.balance)}</span>
        {d.low ? <span className="font-bold">⚠️ Balans ba — recharje!</span> : null}
        <span className="text-black/50">
          Dènyè recharge: {d.lastRecharge ? new Date(d.lastRecharge).toLocaleString() : "—"}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-black/50">Avèti si pi ba pase</span>
          <Input className="h-8 w-20 text-xs" value={minInput} onChange={(e) => setMinInput(e.target.value)} />
          <span className="text-black/50">USD</span>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={saveMin}>
            Sove
          </Button>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={markRecharge}>
          Mwen fè recharge kounye a
        </Button>
        <Link href={d.reloadlyUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline">
          Recharje sou Reloadly →
        </Link>
      </div>
    </div>
  );
}

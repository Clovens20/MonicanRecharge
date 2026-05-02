"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type D = {
  balance: number;
  balanceSource?: "live" | "env";
  liveError?: string | null;
  minAlert: number;
  low: boolean;
  lastRecharge: string | null;
  reloadlyUrl: string;
  totalAgentBalansKomisyonUsd?: number;
};

export function ReloadlyAdminStrip() {
  const [d, setD] = useState<D | null>(null);
  const [minInput, setMinInput] = useState("");
  const [canQuery, setCanQuery] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/is-admin", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setCanQuery(Boolean(j?.admin));
      })
      .catch(() => {
        if (!cancelled) setCanQuery(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    if (!canQuery) return;
    const r = await fetch("/api/admin/reloadly-settings");
    if (r.status === 401 || r.status === 403) return;
    const j = await r.json();
    if (!j.error) {
      setD(j);
      setMinInput(String(j.minAlert ?? ""));
    }
  }

  useEffect(() => {
    if (!canQuery) return;
    const runSoon = () => void load();
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof requestIdleCallback !== "undefined") {
      idleId = requestIdleCallback(runSoon, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(runSoon, 400);
    }
    const id = setInterval(load, 120000);
    return () => {
      clearInterval(id);
      if (idleId !== undefined) cancelIdleCallback(idleId);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [canQuery]);

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

  async function testReloadlyLive() {
    const r = await fetch("/api/reloadly/live-check");
    const j = await r.json();
    if (!r.ok || !j.ok) {
      return toast.error(j.error || "Reloadly live-check echwe");
    }
    toast.success(
      `Reloadly OK (${j.environment}) — solde API: ${j.walletBalance} ${j.walletCurrency}`,
      { duration: 6000 },
    );
    void load();
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
        <span className="inline-flex items-baseline gap-1.5">
          <span>{formatCurrency(d.balance)}</span>
          {d.balanceSource === "live" ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700" title="Solde Reloadly (GET /accounts/balance)">
              API
            </span>
          ) : (
            <span
              className="text-[10px] font-medium uppercase tracking-wide text-amber-800/80"
              title={d.liveError || "Définis RELOADLY_CLIENT_ID + RELOADLY_CLIENT_SECRET pour le solde automatique"}
            >
              .env
            </span>
          )}
        </span>
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
        <Button size="sm" variant="green" className="h-8 text-xs" onClick={testReloadlyLive}>
          Tès API Reloadly
        </Button>
        <Link href={d.reloadlyUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline">
          Recharje sou Reloadly →
        </Link>
        <span
          className="w-full text-[11px] leading-snug text-black/55 md:w-auto md:max-w-[28rem]"
          title="Reloadly diminye lè yon recharge voye, pa lè ajan achte kredi Stripe."
        >
          Sòm balans ajan: {formatCurrency(d.totalAgentBalansKomisyonUsd ?? 0)} · Reloadly diminye nan voye recharge, pa
          nan top-up Stripe.
        </span>
      </div>
    </div>
  );
}

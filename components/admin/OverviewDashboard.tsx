"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const COLORS = ["#10B981", "#F59E0B", "#6366F1", "#EC4899", "#111827"];

type Overview = {
  todayRev: number;
  todayTx: number;
  markupProfitToday?: number;
  markupProfit7d?: number;
  markupProfit30d?: number;
  reloadly: number;
  reloadlyBalanceSource?: "live" | "env";
  reloadlyLow: boolean;
  reloadlyMinAlert: number;
  customers: number;
  agents: number;
  moncashPending: number;
  pendingAjanApps: number;
  /** Sòm `balans_komisyon` ajan aktif (komisyon + prepaid) — pa menm bagay ke balans Reloadly. */
  totalAgentBalansKomisyonUsd?: number;
};

export function OverviewDashboard() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [charts, setCharts] = useState<{
    last7d: { day: string; revenue: number }[];
    byOperator: { name: string; value: number }[];
    byChannel: { name: string; revenue: number }[];
    hourly: { h: number; n: number }[];
  } | null>(null);
  const [feed, setFeed] = useState<{ line: string; ago: string }[]>([]);

  async function load() {
    const [o, a, f] = await Promise.all([
      fetch("/api/admin/overview").then((r) => r.json()),
      fetch("/api/admin/analytics").then((r) => r.json()),
      fetch("/api/admin/feed").then((r) => r.json()),
    ]);
    if (!o.error) setOv(o);
    if (!a.error) setCharts(a);
    if (!f.error) setFeed(f.feed || []);
  }

  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void load();
    };
    tick();
    const id = setInterval(tick, 25000);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl py-2">
        <h1 className="font-display text-3xl font-black tracking-tight text-brand-ink">Admin — Overview</h1>
        <p className="mt-1 text-sm text-black/55">Statistik an tan reyèl (polling 5s) + grafik Mongo.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="💰 Revni jodi a" value={ov ? formatCurrency(ov.todayRev) : "—"} />
              <Stat label="⚡ Tranzaksyon jodi a" value={ov ? String(ov.todayTx) : "—"} />
              <Stat
                label="📈 Marge brute (jodi a)"
                value={ov != null ? formatCurrency(ov.markupProfitToday ?? 0) : "—"}
                hint="Σ (pri vann − pri koutaj) tranzaksyon siksè (Supabase, max 8000 liy)."
              />
              <Stat label="📈 Marge 7 jou" value={ov != null ? formatCurrency(ov.markupProfit7d ?? 0) : "—"} />
              <Stat label="📈 Marge 30 jou" value={ov != null ? formatCurrency(ov.markupProfit30d ?? 0) : "—"} />
              <Stat
                label="🟢 Reloadly balans"
                value={ov ? formatCurrency(ov.reloadly) : "—"}
                alert={ov?.reloadlyLow ? `⚠️ Balans ba! (sou ${formatCurrency(ov.reloadlyMinAlert)})` : undefined}
              />
              <Stat
                label="🤝 Sòm balans ajan (aktif)"
                value={ov != null ? formatCurrency(ov.totalAgentBalansKomisyonUsd ?? 0) : "—"}
                hint="Komisyon + kredi prepaid. Lè ajan voye yon recharge, solde ajan bese epi Reloadly bese (API)."
              />
              <Stat label="👥 Kliyan aktif (~30j)" value={ov ? String(ov.customers) : "—"} />
              <Stat label="🤝 Ajan aktif" value={ov ? String(ov.agents) : "—"} />
              <Stat label="💚 Moncash annatant" value={ov ? String(ov.moncashPending) : "—"} />
              <Stat label="📋 Demann ajan (annatant)" value={ov ? String(ov.pendingAjanApps ?? 0) : "—"} />
            </div>
            {ov && ov.pendingAjanApps > 0 ? (
              <Link
                href="/admin/ajan"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 hover:bg-amber-100"
              >
                Gade {ov.pendingAjanApps} demann aplikasyon ajan →
              </Link>
            ) : null}
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-black/45">Live feed</div>
            <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto text-sm">
              {feed.map((x, i) => (
                <li key={i} className="rounded-lg bg-brand-bg px-2 py-1.5 font-mono text-[11px] text-brand-ink">
                  {x.line}
                  <div className="text-[10px] text-black/40">{x.ago}</div>
                </li>
              ))}
              {feed.length === 0 && <li className="text-black/40">Pa gen done…</li>}
            </ul>
            <Link href="/admin/tranzaksyon" className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline">
              Tout tranzaksyon →
            </Link>
          </div>
        </div>

        {charts && (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Revni 7 dènye jou">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={charts.last7d}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Tranzaksyon pa operatè">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={charts.byOperator} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {charts.byOperator.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Revni pa chèn">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.byChannel}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#6366F1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Aktivite èdtè (jodi a)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.hourly}>
                  <XAxis dataKey="h" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="n" fill="#111827" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        <div className="mt-8 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p>
            <strong>Ajan ki achte kredi marchand (Stripe)</strong> : lajan antre nan kont Stripe Monican.{" "}
            <strong>Reloadly pa diminye</strong> nan moman acha a — li diminye lè yon recharge voye atravè API a (balans
            ajan an retire kò a anvan voye a, epi Reloadly konsome lè tranfer la fèt).
          </p>
          <p>
            <strong>Reloadly</strong> — mete <code className="rounded bg-white/80 px-1">RELOADLY_BALANCE_USD</code> ak{" "}
            <code className="rounded bg-white/80 px-1">RELOADLY_MIN_ALERT_USD</code> nan .env. Cron:{" "}
            <code className="rounded bg-white/80 px-1">/api/cron/verify-reloadly-balance</code>. Lénk biznis:{" "}
            <a className="font-semibold underline" href="https://www.reloadly.com" target="_blank" rel="noreferrer">
              Recharje sou Reloadly →
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, alert, hint }: { label: string; value: string; alert?: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">{label}</div>
      <div className="font-display mt-1 text-xl font-extrabold tracking-tight text-brand-ink">{value}</div>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-black/50">{hint}</p> : null}
      {alert ? <div className="mt-2 text-xs font-semibold text-red-600">{alert}</div> : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-black/50">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

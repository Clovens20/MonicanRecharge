"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RechargeForm } from "@/components/RechargeForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, ShareNetwork } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";

type Agent = {
  kòd_ajan: string;
  non_biznis: string | null;
  to_komisyon: number;
  balans_komisyon: number;
  total_tranzaksyon: number;
  total_komisyon_ganye: number;
  estati: string;
};

type Stats = {
  txToday: number;
  revToday: number;
  txMonth: number;
  komTotalGanye: number;
  balansAnnatant: number;
};

type Line = {
  tranzaksyon_ref: string;
  montant_vann_usd: number;
  montant_komisyon: number;
  created_at: string;
  estati: string;
};

export default function AjanDashboardPage() {
  const [agent, setAgent] = useState<Agent | null>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Line[]>([]);
  const [payoutDetay, setPayoutDetay] = useState("");
  const [payoutMontant, setPayoutMontant] = useState("");

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_APP_URL || "";
  }, []);

  const refUrl = agent ? `${baseUrl}/?ref=${encodeURIComponent(agent.kòd_ajan)}` : "";
  const qrSrc = refUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(refUrl)}`
    : "";

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/ajan/me");
      const me = await r.json();
      if (r.status === 401 || !me.agent) {
        setAgent(null);
        return;
      }
      setAgent(me.agent);
      const st = await fetch("/api/ajan/stats").then((x) => x.json());
      if (st.stats) {
        setStats(st.stats);
        setRecent(st.recent || []);
      }
    })();
  }, []);

  useEffect(() => {
    if (agent === undefined || agent === null) return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("nouvo") !== "1") return;
    const name = agent.non_biznis?.trim() || agent.kòd_ajan;
    toast.success(`Byenveni ${name}! Kòd ou: ${agent.kòd_ajan}`, { duration: 8000 });
    router.replace("/tableau-de-bord/ajan");
  }, [router, agent]);

  async function copyRef() {
    if (!refUrl) return;
    try {
      await navigator.clipboard.writeText(refUrl);
      toast.success("Kopye!");
    } catch {
      toast.error("Pa ka kopye");
    }
  }

  function shareWa() {
    if (!refUrl) return;
    const t = encodeURIComponent(`Egzanp lyen Monican Recharge: ${refUrl}`);
    window.open(`https://wa.me/?text=${t}`, "_blank");
  }

  async function mandePeman() {
    const m = parseFloat(payoutMontant);
    if (!payoutDetay.trim() || !Number.isFinite(m) || m <= 0) {
      toast.error("Ranpli montant ak detay (Moncash # oswa bank)");
      return;
    }
    const res = await fetch("/api/ajan/payout-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ montant: m, detay: payoutDetay }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Erè");
    toast.success("Demann anrejistre");
    setPayoutDetay("");
    setPayoutMontant("");
  }

  if (agent === undefined) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-24 text-center text-black/50">Chajman…</div>
      </main>
    );
  }

  if (!agent) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar />
        <section className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-brand-ink">Ou poko ajan</h1>
          <p className="mt-3 text-sm text-black/55">Aplike oswa konekte ak kont ki apwouve.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="green">
              <Link href="/ajan/aplike">Aplike</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/konekte">Konekte</Link>
            </Button>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">Tablo Ajan</div>
            <h1 className="font-display mt-2 text-3xl font-black tracking-tight sm:text-4xl">Bon retou, {agent.kòd_ajan}</h1>
            <p className="mt-1 text-sm text-black/55">Komisyon ou: {agent.to_komisyon}% sou lavant atravè lyen ou.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/tableau-de-bord">Tablo prensipal</Link>
          </Button>
        </div>

        {stats && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Tranzaksyon jodi a" value={String(stats.txToday)} />
            <StatCard label="Revni jodi a" value={formatCurrency(stats.revToday)} />
            <StatCard label="Tranzaksyon mwa sa a" value={String(stats.txMonth)} />
            <StatCard label="Komisyon total" value={formatCurrency(stats.komTotalGanye)} />
            <StatCard label="Balans annatant" value={formatCurrency(stats.balansAnnatant)} />
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-black/5 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-brand-ink">Lyen pèsonèl ou</h2>
            <p className="mt-1 text-xs text-black/50">Chak moun ki itilize lyen sa → ou gen komisyon.</p>
            <div className="mt-4 break-all rounded-2xl bg-brand-bg p-3 font-mono text-xs text-brand-ink">{refUrl}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyRef}>
                <Copy className="h-4 w-4" /> Kopye
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={shareWa}>
                <ShareNetwork className="h-4 w-4" /> Pataje WhatsApp
              </Button>
            </div>
            {qrSrc ? (
              <div className="mt-6 flex justify-center">
                <Image src={qrSrc} alt="QR" width={180} height={180} unoptimized className="rounded-xl border border-black/10" />
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-brand-ink">Mande peman komisyon</h2>
            <p className="mt-1 text-xs text-black/50">Balans: {formatCurrency(stats?.balansAnnatant || 0)}</p>
            <Input
              className="mt-3"
              placeholder="Montan USD"
              type="number"
              value={payoutMontant}
              onChange={(e) => setPayoutMontant(e.target.value)}
            />
            <textarea
              className="mt-2 min-h-[80px] w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              placeholder="Moncash # oswa bank (non, nimewo kont...)"
              value={payoutDetay}
              onChange={(e) => setPayoutDetay(e.target.value)}
            />
            <Button type="button" variant="green" className="mt-3" onClick={mandePeman}>
              Mande peman
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-brand-ink">Recharge rapid (kòm ajan)</h2>
          <p className="mt-1 text-xs text-black/50">Ou fè {agent.to_komisyon}% sou chak vann.</p>
          <div className="mt-4 max-w-xl">
            <RechargeForm commissionPct={Number(agent.to_komisyon)} agentRefCode={agent.kòd_ajan} />
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-brand-ink">Istwa komisyon</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wider text-black/45">
                  <th className="py-2">Dat</th>
                  <th className="py-2">Tranzaksyon</th>
                  <th className="py-2">Montan</th>
                  <th className="py-2">Komisyon</th>
                  <th className="py-2">Estati</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.tranzaksyon_ref + r.created_at} className="border-b border-black/5">
                    <td className="py-2 text-black/60">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs">{r.tranzaksyon_ref}</td>
                    <td className="py-2">{formatCurrency(Number(r.montant_vann_usd))}</td>
                    <td className="py-2 font-semibold text-emerald-700">{formatCurrency(Number(r.montant_komisyon))}</td>
                    <td className="py-2">{r.estati}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recent.length === 0 && <p className="mt-4 text-sm text-black/45">Poko gen tranzaksyon.</p>}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/40">{label}</div>
      <div className="font-display mt-1 text-xl font-extrabold tracking-tight text-brand-ink">{value}</div>
    </div>
  );
}

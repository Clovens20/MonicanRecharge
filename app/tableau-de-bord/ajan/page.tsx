"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Copy, List, ShareNetwork } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";

const RechargeForm = dynamic(
  () => import("@/components/RechargeForm").then((m) => m.RechargeForm),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/50">
        Chajman fòm recharge...
      </div>
    ),
  },
);

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
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Line[]>([]);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState("Moncash");
  const [topupRef, setTopupRef] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

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

  function voirSolde() {
    const b = stats?.balansAnnatant ?? agent?.balans_komisyon ?? 0;
    toast.success(`Solde ajan ou: ${formatCurrency(Number(b || 0))}`, { duration: 5000 });
  }

  function shareWa() {
    if (!refUrl) return;
    const t = encodeURIComponent(`Egzanp lyen Monican Recharge: ${refUrl}`);
    window.open(`https://wa.me/?text=${t}`, "_blank");
  }

  async function mandeEd() {
    if (!helpSubject.trim() || !helpMessage.trim()) {
      toast.error("Mete sijè ak mesaj la.");
      return;
    }
    setHelpLoading(true);
    try {
      const res = await fetch("/api/ajan/help-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sijè: helpSubject, mesaj: helpMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Erè");
      toast.success("Demann èd voye bay admin.");
      setHelpSubject("");
      setHelpMessage("");
    } finally {
      setHelpLoading(false);
    }
  }

  async function mandeRechargeKont() {
    const amount = parseFloat(topupAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Mete montan valab pou rechaj kont la.");
      return;
    }
    setTopupLoading(true);
    try {
      const res = await fetch("/api/ajan/topup/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: amount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Erè");
      if (!data.url) return toast.error("Stripe URL pa jwenn");
      window.location.assign(data.url);
    } finally {
      setTopupLoading(false);
    }
  }

  if (agent === undefined) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar mode="agent" />
        <div className="mx-auto max-w-xl px-4 py-24 text-center text-black/50">Chajman…</div>
      </main>
    );
  }

  if (!agent) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar mode="agent" />
        <section className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-brand-ink">Ou poko ajan</h1>
          <p className="mt-3 text-sm text-black/55">Aplike oswa konekte ak kont ki apwouve.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="green">
              <Link href="/ajan/aplike">Aplike</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/konekte?next=%2Fagent">Konekte</Link>
            </Button>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar mode="agent" />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">Tablo Ajan</div>
            <h1 className="font-display mt-2 text-3xl font-black tracking-tight sm:text-4xl">Bon retou, {agent.kòd_ajan}</h1>
            <p className="mt-1 text-sm text-black/55">Komisyon ou: {agent.to_komisyon}% sou lavant atravè lyen ou.</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <List className="h-4 w-4" /> Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <a href="#recharge-agent">Recharge kliyan</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#topup-agent">Rechaje kont marchand</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#lyen-agent">Lyen referans</a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={voirSolde}>Konsilte solde ajan</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#ed-agent">Sipò / Èd</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="#istwa-agent">Istwa komisyon</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ajan/byenveni?premye=1">Chanje modpas</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/tableau-de-bord">Tablo prensipal</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <div id="lyen-agent" className="rounded-3xl border border-black/5 bg-white p-6">
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
            <h2 className="font-display text-lg font-bold text-brand-ink">Aksyon rapid</h2>
            <p className="mt-1 text-xs text-black/50">Aksè dirèk pou jere kont ajan ou.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="#recharge-agent">Recharge kliyan</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href="#topup-agent">Rechaje kont marchand</a>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={voirSolde}>
                Konsilte solde ajan
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="#ed-agent">Sipò / Èd</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/ajan/byenveni?premye=1">Chanje modpas</Link>
              </Button>
              <Button asChild variant="green" size="sm">
                <a href="#recharge-agent">Fè recharge kliyan</a>
              </Button>
            </div>
          </div>
        </div>

        <div id="recharge-agent" className="mt-10">
          <h2 className="font-display text-lg font-bold text-brand-ink">Recharge rapid (kòm ajan)</h2>
          <p className="mt-1 text-xs text-black/50">Ou fè {agent.to_komisyon}% sou chak vann.</p>
          <div className="mt-4 max-w-xl">
            <RechargeForm
              commissionPct={Number(agent.to_komisyon)}
              agentRefCode={agent.kòd_ajan}
              allowAgentPricing
            />
          </div>
        </div>

        <div id="ed-agent" className="mt-10 rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-brand-ink">Mande èd admin</h2>
          <p className="mt-1 text-xs text-black/50">
            Si gen pwoblèm sou kredi, tranzaksyon, oswa aksè, voye yon demann isit la. Admin ap wè l nan panel li.
          </p>
          <Input
            className="mt-3"
            placeholder="Sijè (eg. Kredi pa antre)"
            value={helpSubject}
            onChange={(e) => setHelpSubject(e.target.value)}
          />
          <textarea
            className="mt-2 min-h-[100px] w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder="Dekri pwoblèm nan ak detay..."
            value={helpMessage}
            onChange={(e) => setHelpMessage(e.target.value)}
          />
          <Button type="button" variant="green" className="mt-3" disabled={helpLoading} onClick={mandeEd}>
            {helpLoading ? "Voye..." : "Voye demann èd"}
          </Button>
        </div>

        <div id="topup-agent" className="mt-10 rounded-3xl border border-black/5 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-brand-ink">Rechaje kont marchand</h2>
          <p className="mt-1 text-xs text-black/50">
            Peye ak kat debit/kredi. Si peman an reyisi, sistèm nan ajoute kredi a otomatikman sou solde ajan ou.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Input
              type="number"
              step="0.01"
              min="1"
              placeholder="Montan USD"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
            />
            <Input value="Card (Stripe)" readOnly className="bg-black/5 text-sm" />
            <Input
              placeholder="Nòt (opsyonèl)"
              value={topupRef}
              onChange={(e) => setTopupRef(e.target.value)}
            />
          </div>
          <Button type="button" variant="green" className="mt-3" disabled={topupLoading} onClick={mandeRechargeKont}>
            {topupLoading ? "Tanpri tann..." : "Peye epi rechaje kont otomatikman"}
          </Button>
        </div>

        <div id="istwa-agent" className="mt-12 rounded-3xl border border-black/5 bg-white p-6">
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

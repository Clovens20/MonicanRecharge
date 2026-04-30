"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Apl = {
  id: string;
  non_konplè: string;
  imèl: string;
  vil: string | null;
  peyi: string | null;
  created_at: string;
};

type Ag = {
  user_id: string;
  kòd_ajan: string;
  non_biznis: string | null;
  vil: string | null;
  peyi: string | null;
  total_tranzaksyon: number;
  balans_komisyon: number;
  to_komisyon: number;
  estati: string;
};

type Dem = { id: string; ajan_id: string; montant: number; detay: string; created_at: string };

export default function AdminAjanPage() {
  const [tab, setTab] = useState<"app" | "actif" | "demann">("app");
  const [apps, setApps] = useState<Apl[]>([]);
  const [agents, setAgents] = useState<Ag[]>([]);
  const [demann, setDemann] = useState<Dem[]>([]);
  const [pctById, setPctById] = useState<Record<string, string>>({});
  const [forbidden, setForbidden] = useState<"login" | "denied" | null>(null);

  async function load() {
    const [ra, rg, rd] = await Promise.all([
      fetch("/api/admin/ajan/applications"),
      fetch("/api/admin/ajan/active"),
      fetch("/api/admin/ajan/demandes-peman"),
    ]);
    if (ra.status === 401 || rg.status === 401) {
      setForbidden("login");
      return;
    }
    const [a, g, d] = await Promise.all([ra.json(), rg.json(), rd.json()]);
    if (a.error === "Forbidden" || g.error === "Forbidden") {
      setForbidden("denied");
      return;
    }
    setForbidden(null);
    setApps(a.applications || []);
    setAgents(g.agents || []);
    setDemann(d.demandes || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    const pct = parseFloat(pctById[id] || "5");
    const res = await fetch("/api/admin/ajan/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aplasyonId: id, toKomisyon: pct }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Erè");
    const suffix =
      data.invite_sent === true
        ? " Imèl envitasyon Supabase voye (kreye modpas)."
        : data.existing_account === true
          ? " Kont te deja egziste — gade imèl ou."
          : "";
    toast.success(`Apwouve — ${data.kòd_ajan || ""}.${suffix}`);
    load();
  }

  async function reject(id: string) {
    const res = await fetch("/api/admin/ajan/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aplasyonId: id }),
    });
    if (!res.ok) return toast.error("Erè");
    toast.success("Refize");
    load();
  }

  async function payAgent(userId: string, montant: number) {
    const res = await fetch("/api/admin/ajan/pay-commission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ajanUserId: userId,
        montant,
        mòd_peman: "admin",
        referans: `PAY-${Date.now()}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Erè");
    toast.success("Peman anrejistre");
    load();
  }

  if (forbidden === "login") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-xl font-bold">Konekte</h1>
        <p className="mt-2 text-sm text-black/55">Ou dwe konekte kòm admin.</p>
        <Button asChild className="mt-6" variant="green">
          <Link href="/konekte">Konekte</Link>
        </Button>
      </div>
    );
  }

  if (forbidden === "denied") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-xl font-bold">Aksè refize</h1>
        <p className="mt-2 text-sm text-black/55">Imèl ou dwe nan ADMIN_EMAILS nan .env</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/">Akèy</Link>
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl font-black tracking-tight text-brand-ink">Admin — Ajan yo</h1>
        <p className="mt-1 text-sm text-black/55">Jere aplikasyon, ajan aktif, ak demann peman.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["app", "actif", "demann"] as const).map((t) => (
            <Button key={t} variant={tab === t ? "green" : "outline"} size="sm" onClick={() => setTab(t)}>
              {t === "app" ? "Aplikasyon" : t === "actif" ? "Ajan aktif" : "Demann peman"}
            </Button>
          ))}
        </div>

        {tab === "app" && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-black/10 bg-brand-bg text-xs uppercase tracking-wider text-black/45">
                <tr>
                  <th className="p-3">Non</th>
                  <th className="p-3">Imèl</th>
                  <th className="p-3">Vil</th>
                  <th className="p-3">Dat</th>
                  <th className="p-3">%</th>
                  <th className="p-3">Aksyon</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((p) => (
                  <tr key={p.id} className="border-b border-black/5">
                    <td className="p-3 font-medium">{p.non_konplè}</td>
                    <td className="p-3 font-mono text-xs">{p.imèl}</td>
                    <td className="p-3 text-black/60">{p.vil || "—"}</td>
                    <td className="p-3 text-black/60">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Input
                        className="h-9 w-16"
                        placeholder="5"
                        value={pctById[p.id] ?? ""}
                        onChange={(e) => setPctById((s) => ({ ...s, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="green" onClick={() => approve(p.id)}>
                          Apwouve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject(p.id)}>
                          Refize
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {apps.length === 0 && <p className="p-6 text-sm text-black/45">Pa gen aplikasyon annatant.</p>}
          </div>
        )}

        {tab === "actif" && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-black/10 bg-brand-bg text-xs uppercase tracking-wider text-black/45">
                <tr>
                  <th className="p-3">Kòd</th>
                  <th className="p-3">Biznis</th>
                  <th className="p-3">Tx</th>
                  <th className="p-3">Balans</th>
                  <th className="p-3">%</th>
                  <th className="p-3">Peman</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.user_id} className="border-b border-black/5">
                    <td className="p-3 font-mono font-bold">{a.kòd_ajan}</td>
                    <td className="p-3">{a.non_biznis || "—"}</td>
                    <td className="p-3">{a.total_tranzaksyon}</td>
                    <td className="p-3 font-semibold text-emerald-700">{formatCurrency(Number(a.balans_komisyon))}</td>
                    <td className="p-3">{a.to_komisyon}%</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Number(a.balans_komisyon) <= 0}
                        onClick={() => payAgent(a.user_id, Number(a.balans_komisyon))}
                      >
                        Peye tout
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "demann" && (
          <div className="mt-8 space-y-3">
            {demann.map((d) => (
              <div key={d.id} className="rounded-2xl border border-black/5 bg-white p-4 text-sm">
                <div className="font-mono text-xs text-black/45">{d.ajan_id}</div>
                <div className="mt-1 font-bold">{formatCurrency(Number(d.montant))}</div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-black/70">{d.detay}</pre>
                <div className="mt-2 text-xs text-black/40">{new Date(d.created_at).toLocaleString()}</div>
              </div>
            ))}
            {demann.length === 0 && <p className="text-sm text-black/45">Pa gen demann.</p>}
          </div>
        )}
    </section>
  );
}

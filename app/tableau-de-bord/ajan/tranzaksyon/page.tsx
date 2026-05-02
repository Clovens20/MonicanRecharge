"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft } from "@phosphor-icons/react";

type Row = {
  id: string;
  created_at: string;
  estati: string;
  operatè: string | null;
  nimewo_resevwa: string | null;
  pays_kòd: string | null;
  montant_usd: number | string | null;
  pri_koutaj: number | string | null;
  benefis: number | string | null;
  frais_platfòm_usd: number | string | null;
  mòd_peman: string | null;
  reloadly_transaction_id: string | null;
  ref_kòd: string | null;
};

export default function AjanTranzaksyonPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadTick, setLoadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setErr(null);
    void fetch("/api/ajan/my-recharges", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) {
          setErr(j.error || "Erè");
          setRows([]);
          return;
        }
        setRows(j.recharges || []);
        setErr(null);
      })
      .catch(() => {
        if (!cancelled) {
          setErr("Rezo");
          setRows([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadTick]);

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar mode="agent" />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">Ajan</div>
            <h1 className="font-display mt-1 text-2xl font-black text-brand-ink">Tranzaksyon ou voye yo</h1>
            <p className="mt-1 text-sm text-black/55">
              Lis recharge ou te fè depi kont ou (kòm revandè). Vann atravè lyen referans parèt sou kont kliyan an.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/tableau-de-bord/ajan">
              <ArrowLeft className="h-4 w-4" /> Retounen tablo ajan
            </Link>
          </Button>
        </div>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 bg-white">
          {rows === null ? (
            <p className="p-6 text-sm text-black/50">Chajman…</p>
          ) : err ? (
            <div className="p-6">
              <p className="text-sm text-red-600">{err}</p>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setLoadTick((n) => n + 1)}>
                Eseye ankò
              </Button>
            </div>
          ) : (
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-black/10 bg-brand-bg text-xs uppercase tracking-wider text-black/45">
                <tr>
                  <th className="p-3">Dat</th>
                  <th className="p-3">Destinataire</th>
                  <th className="p-3">Operatè</th>
                  <th className="p-3">Montan</th>
                  <th className="p-3">Kò</th>
                  <th className="p-3">Frè platf.</th>
                  <th className="p-3">Benefis</th>
                  <th className="p-3">Peman</th>
                  <th className="p-3">Estati</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-black/5">
                    <td className="p-3 whitespace-nowrap text-black/60">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3 font-mono text-xs">
                      {r.pays_kòd || "HT"} {r.nimewo_resevwa || "—"}
                    </td>
                    <td className="p-3">{r.operatè || "—"}</td>
                    <td className="p-3 font-semibold">{formatCurrency(Number(r.montant_usd || 0))}</td>
                    <td className="p-3 text-black/70">{formatCurrency(Number(r.pri_koutaj ?? r.montant_usd ?? 0))}</td>
                    <td className="p-3 text-black/60">{formatCurrency(Number(r.frais_platfòm_usd ?? 0))}</td>
                    <td className="p-3 font-medium text-emerald-800">{formatCurrency(Number(r.benefis ?? 0))}</td>
                    <td className="p-3 text-xs">{r.mòd_peman || "—"}</td>
                    <td className="p-3">
                      <span
                        className={
                          r.estati === "siksè"
                            ? "font-semibold text-emerald-700"
                            : r.estati === "echwe"
                              ? "text-red-600"
                              : "text-amber-700"
                        }
                      >
                        {r.estati}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {rows && rows.length === 0 && !err ? (
            <p className="p-6 text-sm text-black/45">Poko gen tranzaksyon sou kont ou.</p>
          ) : null}
        </div>
      </section>
      <Footer />
    </main>
  );
}

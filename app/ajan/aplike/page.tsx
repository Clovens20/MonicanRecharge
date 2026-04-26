"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AjanAplikePage() {
  const [loading, setLoading] = useState(false);
  const [non_konplè, setNonKonplè] = useState("");
  const [imèl, setImèl] = useState("");
  const [telefòn, setTelefòn] = useState("");
  const [non_biznis, setNonBiznis] = useState("");
  const [vil, setVil] = useState("");
  const [peyi, setPeyi] = useState("");
  const [pwomosyon_tekst, setPwomosyon] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/ajan/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          non_konplè,
          imèl,
          telefòn,
          non_biznis,
          vil,
          peyi,
          pwomosyon_tekst,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erè");
      toast.success("Aplikasyon voye! N ap kontakte w.");
      setNonKonplè("");
      setImèl("");
      setTelefòn("");
      setNonBiznis("");
      setVil("");
      setPeyi("");
      setPwomosyon("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erè");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar />
      <section className="mx-auto max-w-lg px-4 py-14">
        <Link href="/ajan" className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 hover:underline">
          ← Retounen
        </Link>
        <h1 className="font-display mt-4 text-3xl font-black tracking-tight text-brand-ink">Aplikasyon Ajan</h1>
        <p className="mt-2 text-sm text-black/55">Ranpli fòm la. Admin ap revize l epi voye w imèl.</p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">Non konplè *</label>
            <Input className="mt-1" required value={non_konplè} onChange={(e) => setNonKonplè(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">Imèl *</label>
            <Input className="mt-1" type="email" required value={imèl} onChange={(e) => setImèl(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">Telefòn</label>
            <Input className="mt-1" type="tel" value={telefòn} onChange={(e) => setTelefòn(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">Non biznis (opsyonèl)</label>
            <Input className="mt-1" value={non_biznis} onChange={(e) => setNonBiznis(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">Vil</label>
              <Input className="mt-1" value={vil} onChange={(e) => setVil(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">Peyi</label>
              <Input className="mt-1" value={peyi} onChange={(e) => setPeyi(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-black/50">Koman ou pral pwomote sèvis la?</label>
            <textarea
              className="mt-1 min-h-[100px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none ring-emerald-100 focus:border-emerald-500 focus:ring-4"
              value={pwomosyon_tekst}
              onChange={(e) => setPwomosyon(e.target.value)}
            />
          </div>
          <Button type="submit" variant="green" size="lg" className="w-full" disabled={loading}>
            {loading ? "N ap voye…" : "Voye aplikasyon"}
          </Button>
        </form>
      </section>
      <Footer />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function AjanTopupSuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState("Nou ap verifye peman an...");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const sid = sp.get("session_id");
    if (!sid) {
      setMsg("Session Stripe pa jwenn.");
      return;
    }
    let done = false;
    void fetch("/api/ajan/topup/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (done) return;
        if (!r.ok) {
          setMsg(j.error || "Verifikasyon echwe.");
          return;
        }
        setOk(true);
        const amount = Number(j.amountUsd || j.montant || 0);
        const newBal = Number(j.newBalance || 0);
        if (amount > 0) setMsg(`Top-up valide: $${amount.toFixed(2)} ajoute. Nouvo solde: $${newBal.toFixed(2)}`);
        else setMsg("Top-up deja valide sou kont ou.");
        setTimeout(() => router.replace("/agent"), 1200);
      })
      .catch(() => {
        if (!done) setMsg("Erè rezo pandan verifikasyon.");
      });
    return () => {
      done = true;
    };
  }, [sp, router]);

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar mode="agent" />
      <section className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className={`rounded-3xl border p-8 ${ok ? "border-emerald-200 bg-emerald-50" : "border-black/10 bg-white"}`}>
          <h1 className="font-display text-2xl font-black text-brand-ink">Top-up kont agent</h1>
          <p className="mt-3 text-sm text-black/60">{msg}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/agent">Retounen sou tablo ajan</Link>
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

"use client";

/**
 * Peman Moncash manyèl (MVP).
 * TODO: Replace with Moncash API when credentials available
 * API Docs: https://sandbox.moncashbutton.digicelgroup.com/Api/documentation
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency, formatHTG } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type OrderMeta = {
  orderPublicId: string;
  amountUsd: number;
  htg: number;
  moncashNumero: string;
  estati: string;
  moncashQrUrl: string;
};

export default function MoncashPayPage({ params }: { params: { orderPublicId: string } }) {
  const { orderPublicId } = params;
  const [meta, setMeta] = useState<OrderMeta | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch(`/api/recharge/moncash-order/${orderPublicId}`);
      const d = await r.json();
      if (!cancelled) {
        if (!r.ok) toast.error(d.error || "Pa jwenn lòd la");
        else setMeta(d);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderPublicId]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) {
      toast.error("Chwazi yon imaj");
      return;
    }
    if (f.size > 800_000) {
      toast.error("Imaj twò gwo (max ~800Ko)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      setShot(r);
    };
    reader.readAsDataURL(f);
  }

  async function submit() {
    if (!shot) {
      toast.error("Ajoute screenshot la");
      return;
    }
    const r = await fetch(`/api/recharge/moncash-order/${orderPublicId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenshotBase64: shot }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Erè");
    toast.success("Nou resevwa screenshot la. Admin ap verifye.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-black/50">Chajman…</div>
      </main>
    );
  }

  if (!meta) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-black/60">Lòd la pa egziste.</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-emerald-700 underline">
            Retounen
          </Link>
        </div>
      </main>
    );
  }

  if (meta.estati !== "annatant") {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="font-display text-xl font-bold text-brand-ink">
            {meta.estati === "konfime" ? "✅ Peman konfime — recharge la dwe ale." : "❌ Peman refize."}
          </p>
          <Link href="/tableau-de-bord" className="mt-6 inline-block font-semibold text-emerald-700 underline">
            Tableau de bord
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-ink">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-display text-2xl font-black tracking-tight">💚 Moncash</h1>
        <p className="mt-1 text-sm text-black/55">Lòd: <span className="font-mono">{meta.orderPublicId}</span></p>

        <div className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="text-center">
            <div className="text-sm text-black/50">Montant pou voye</div>
            <div className="font-display text-3xl font-black">{formatCurrency(meta.amountUsd)}</div>
            <div className="mt-1 text-lg font-semibold text-emerald-800">
              ={" "}
              {formatHTG(meta.amountUsd, meta.amountUsd > 0 ? meta.htg / meta.amountUsd : undefined)}{" "}
              HTG
            </div>
            <p className="mt-1 text-xs text-black/45">(HTG dapre lòd la)</p>
          </div>

          {meta.moncashQrUrl ? (
            <div className="relative mx-auto mt-6 h-48 w-48">
              <Image src={meta.moncashQrUrl} alt="QR Moncash" fill className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-brand-bg p-4 text-center text-sm text-black/50">QR pa konfigire (NEXT_PUBLIC_MONCASH_QR_IMAGE_URL)</div>
          )}

          <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm">
            <li>Ouvri aplikasyon Moncash ou</li>
            <li>Klike &quot;Peye&quot; oswa &quot;Send Money&quot;</li>
            <li>Antre: {meta.moncashNumero}</li>
            <li>Montant: HTG (menm valè ki anwo)</li>
            <li>Referans: <span className="font-mono font-bold">{meta.orderPublicId}</span></li>
            <li>Pran yon screenshot konfirmasyon</li>
          </ol>

          <div className="mt-6 space-y-3">
            <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-black/20 bg-brand-bg px-4 py-6 text-sm font-semibold hover:border-emerald-400">
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              📷 Chwazi screenshot
            </label>
            {shot ? <p className="text-center text-xs text-emerald-700">Screenshot pare ✓</p> : null}
            <Button variant="green" className="w-full" size="lg" onClick={submit}>
              Mwen peye deja →
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-black/45">
          Apre admin konfime, recharge la ap voye otomatikman. Ou pral resevwa imèl / WhatsApp si konfigire.
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm font-semibold text-emerald-800 underline">
            ← Retounen
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}

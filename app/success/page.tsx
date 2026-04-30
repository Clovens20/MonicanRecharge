"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { CheckCircle } from "@phosphor-icons/react";

function SuccessContent() {
  const { t } = useLang();
  const sp = useSearchParams();
  const txId = sp.get("tx");

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle weight="fill" className="h-9 w-9" />
        </div>
        <h1 className="font-display mt-6 text-2xl font-black tracking-tight text-brand-ink">{t("success.stripe_title")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-black/60">{t("success.stripe_body")}</p>
        {txId ? (
          <p className="mt-4 font-mono text-xs text-black/40">
            ID: {txId}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="green">
            <Link href="/istwa">{t("nav.history")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tableau-de-bord">{t("nav.dashboard")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar />
      <Suspense
        fallback={
          <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-black/50">…</div>
        }
      >
        <SuccessContent />
      </Suspense>
      <Footer />
    </main>
  );
}

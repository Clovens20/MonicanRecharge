"use client";

import Link from "next/link";
import { ADMIN_NAV_LINKS } from "@/lib/admin/nav-links";

export default function AdminParametPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-black text-brand-ink">Paramèt</h1>
      <p className="mt-1 text-sm text-black/55">Lyen rapid ak rapèl konfigirasyon.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-black/50">Paj admin</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/admin/markup" className="font-medium text-emerald-700 hover:underline">
                Markup kliyan (pri global) →
              </Link>
            </li>
            {ADMIN_NAV_LINKS.filter((l) => l.key !== "paramet").map((l) => (
              <li key={l.key}>
                <Link href={l.href} className="font-medium text-emerald-700 hover:underline">
                  {l.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-black/50">Sèvis deyò</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className="font-medium text-emerald-700 hover:underline" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
                Supabase Dashboard →
              </a>
            </li>
            <li>
              <a className="font-medium text-emerald-700 hover:underline" href="https://www.reloadly.com" target="_blank" rel="noreferrer">
                Reloadly →
              </a>
            </li>
            <li>
              <a className="font-medium text-emerald-700 hover:underline" href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                Stripe Dashboard →
              </a>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5 sm:col-span-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-black/50">Fich .env (rapèl)</h2>
          <p className="mt-2 text-sm leading-relaxed text-black/65">
            Verifye <code className="rounded bg-brand-bg px-1 text-xs">NEXT_PUBLIC_APP_URL</code>, kle Supabase,{" "}
            <code className="rounded bg-brand-bg px-1 text-xs">ADMIN_EMAILS</code>, cron{" "}
            <code className="rounded bg-brand-bg px-1 text-xs">CRON_SECRET</code>, ak Reloadly / Stripe selon bezwen w.
          </p>
        </section>
      </div>
    </div>
  );
}

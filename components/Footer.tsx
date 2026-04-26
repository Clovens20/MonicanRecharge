"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { Lightning, ArrowSquareOut } from "@phosphor-icons/react";

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative overflow-hidden bg-brand-ink text-white">
      <div className="noise" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-ink">
                <Lightning weight="fill" className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-xl font-extrabold tracking-tight">Monican</div>
                <div className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Recharge</div>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm text-white/60 leading-relaxed">
              Voye Recharge — Rapid, Fasil, Kote ou Ye. {t("footer.tag")}
            </p>
            <a
              data-testid="footer-monican-shop"
              href="https://monican.shop"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-white/80 hover:border-emerald-400 hover:text-emerald-300"
            >
              VISIT MONICAN.SHOP <ArrowSquareOut className="h-3.5 w-3.5" />
            </a>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Product</div>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li><Link href="/" className="hover:text-white">{t("nav.home")}</Link></li>
              <li><Link href="/tableau-de-bord" className="hover:text-white">{t("nav.dashboard")}</Link></li>
              <li><Link href="/istwa" className="hover:text-white">{t("nav.history")}</Link></li>
              <li><Link href="/kontak" className="hover:text-white">{t("nav.contacts")}</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Account</div>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li><Link href="/konekte" className="hover:text-white">{t("nav.login")}</Link></li>
              <li><Link href="/enskri" className="hover:text-white">{t("nav.signup")}</Link></li>
              <li><a href="mailto:support@monican.shop" className="hover:text-white">support@monican.shop</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
          <span>{t("footer.rights")}</span>
          <span className="font-mono">recharge.monican.shop</span>
        </div>
      </div>
    </footer>
  );
}

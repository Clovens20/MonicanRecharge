"use client";

import Link from "next/link";
import { Lightning } from "@phosphor-icons/react";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";

export function LandingFooter() {
  const { t } = useLang();

  function openPwa() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("monican-open-pwa-banner"));
    }
  }

  return (
    <footer className="border-t border-white/10 bg-[#050810] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-[#00D084]">
                <Lightning weight="fill" className="h-5 w-5" />
              </span>
              <span className="font-landing-display text-lg font-extrabold text-white">Monican Recharge</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">{t("landing.footer_brand")}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <a href="https://facebook.com" className="text-slate-400 hover:text-white" target="_blank" rel="noreferrer">
                Facebook
              </a>
              <a href="https://instagram.com" className="text-slate-400 hover:text-white" target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href="https://tiktok.com" className="text-slate-400 hover:text-white" target="_blank" rel="noreferrer">
                TikTok
              </a>
              <a href="https://wa.me/17178801479" className="text-slate-400 hover:text-white" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-6 border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={openPwa}
            >
              {t("pwa.install_btn")} →
            </Button>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("landing.footer_links")}</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="#recharge-main" className="hover:text-[#00D084]">
                  {t("landing.cta_send")}
                </Link>
              </li>
              <li>
                <Link href="#coverage" className="hover:text-[#00D084]">
                  {t("landing.nav_coverage")}
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-[#00D084]">
                  {t("landing.nav_how")}
                </Link>
              </li>
              <li>
                <Link href="/ajan" className="hover:text-[#00D084]">
                  {t("landing.nav_agents")}
                </Link>
              </li>
              <li>
                <Link href="#recharge-main" className="hover:text-[#00D084]">
                  {t("landing.nav_pricing")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("landing.footer_support")}</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="mailto:support@monican.shop" className="hover:text-[#00D084]">
                  support@monican.shop
                </a>
              </li>
              <li>
                <a href="https://wa.me/17178801479" className="hover:text-[#00D084]" target="_blank" rel="noreferrer">
                  WhatsApp: +1 717-880-1479
                </a>
              </li>
              <li>
                <Link href="/kontak" className="hover:text-[#00D084]">
                  {t("landing.footer_faq")}
                </Link>
              </li>
              <li>
                <a href="https://monican.shop" target="_blank" rel="noreferrer" className="hover:text-[#00D084]">
                  {t("landing.footer_privacy")}
                </a>
              </li>
              <li>
                <a href="https://monican.shop" target="_blank" rel="noreferrer" className="hover:text-[#00D084]">
                  {t("landing.footer_terms")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div>© 2026 Monican LLC · recharge.monican.shop</div>
            <div className="mt-1 text-slate-600">{t("landing.footer_bottom")}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 px-3 py-1">Stripe</span>
            <span className="rounded-full border border-white/10 px-3 py-1">SSL</span>
            <span className="rounded-full border border-white/10 px-3 py-1">Reloadly</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

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
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-[#00D084]">
                <Lightning weight="fill" className="h-5 w-5" />
              </span>
              <span className="font-landing-display text-lg font-extrabold text-white">Monican Recharge</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">{t("landing.footer_brand")}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-lg">
              <a href="https://facebook.com" className="text-slate-500 transition hover:text-white" target="_blank" rel="noreferrer" aria-label="Facebook">
                <span aria-hidden>📘</span>
              </a>
              <a href="https://instagram.com" className="text-slate-500 transition hover:text-white" target="_blank" rel="noreferrer" aria-label="Instagram">
                <span aria-hidden>📸</span>
              </a>
              <a href="https://tiktok.com" className="text-slate-500 transition hover:text-white" target="_blank" rel="noreferrer" aria-label="TikTok">
                <span aria-hidden>🎵</span>
              </a>
              <a href="https://wa.me/17178801479" className="text-slate-500 transition hover:text-[#25D366]" target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <span aria-hidden>💬</span>
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
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{t("landing.footer_col2_title")}</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-[#00D084]">
                  {t("landing.footer_link_home")}
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-[#00D084]">
                  {t("landing.footer_link_how")}
                </Link>
              </li>
              <li>
                <Link href="#coverage" className="hover:text-[#00D084]">
                  {t("landing.footer_link_countries")}
                </Link>
              </li>
              <li>
                <Link href="/ajan" className="hover:text-[#00D084]">
                  {t("landing.footer_link_agent")}
                </Link>
              </li>
              <li>
                <Link href="#recharge-main" className="hover:text-[#00D084]">
                  {t("landing.footer_link_pricing")}
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
                  {t("landing.footer_terms")}
                </a>
              </li>
              <li>
                <a href="https://monican.shop" target="_blank" rel="noreferrer" className="hover:text-[#00D084]">
                  {t("landing.footer_privacy")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div>© 2026 Monican LLC | recharge.monican.shop | {t("landing.footer_bottom")}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 px-3 py-1">Stripe</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{t("landing.footer_badge_ssl")}</span>
            <span className="rounded-full border border-white/10 px-3 py-1">{t("landing.footer_badge_reloadly")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

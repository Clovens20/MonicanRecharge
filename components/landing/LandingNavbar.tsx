"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Lightning, List, X } from "@phosphor-icons/react";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<unknown>(null);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    void sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { key: "home", href: "/", label: t("nav.home") },
    { key: "how", href: "#how-it-works", label: t("landing.nav_how") },
    { key: "cov", href: "#coverage", label: t("landing.nav_coverage") },
    { key: "agents", href: "/ajan", label: t("landing.nav_agents") },
    { key: "price", href: "#recharge-main", label: t("landing.nav_pricing") },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-white/10 bg-[#0A0E1A]/85 py-2 backdrop-blur-xl" : "bg-transparent py-3",
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" data-testid="nav-logo">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-[#00D084] ring-1 ring-white/15">
            <Lightning weight="fill" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="font-landing-display text-base font-extrabold tracking-tight text-white">Monican</div>
            <div className="-mt-0.5 inline-flex rounded-full bg-[#00D084]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#00D084]">
              Recharge
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
              prefetch={false}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle dark />
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Button asChild variant="glass" size="sm">
                <Link href="/tableau-de-bord" prefetch={false}>
                  {t("nav.dashboard")}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="glass" size="sm">
                <Link href="/konekte" prefetch={false}>
                  {t("nav.login")}
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className="rounded-full border-0 bg-gradient-to-r from-[#00D084] to-emerald-500 px-5 text-white shadow-[0_8px_30px_rgba(0,208,132,0.35)] hover:brightness-110"
            >
              <Link href="#recharge-main" prefetch={false}>
                {t("landing.cta_send")}
              </Link>
            </Button>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" weight="bold" /> : <List className="h-5 w-5" weight="bold" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-[#0A0E1A]/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={`m-${l.key}`}
                href={l.href}
                className="rounded-xl px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/5"
                onClick={() => setOpen(false)}
                prefetch={false}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              {user ? (
                <Button asChild variant="glass" className="w-full">
                  <Link href="/tableau-de-bord" prefetch={false} onClick={() => setOpen(false)}>
                    {t("nav.dashboard")}
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="glass" className="w-full">
                  <Link href="/konekte" prefetch={false} onClick={() => setOpen(false)}>
                    {t("nav.login")}
                  </Link>
                </Button>
              )}
              <Button asChild className="w-full rounded-full bg-gradient-to-r from-[#00D084] to-emerald-500 text-white">
                <Link href="#recharge-main" prefetch={false} onClick={() => setOpen(false)}>
                  {t("landing.cta_send")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

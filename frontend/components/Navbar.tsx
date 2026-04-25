"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "./ui/button";
import { Lightning, List, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function Navbar({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { t } = useLang();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    const sb = createClient();
    if (!sb) return;
    await sb.auth.signOut();
    router.push("/");
  }

  const isDark = variant === "dark";
  const linkBase = isDark ? "text-white/80 hover:text-white" : "text-brand-ink/70 hover:text-brand-ink";
  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/tableau-de-bord", label: t("nav.dashboard") },
    { href: "/istwa", label: t("nav.history") },
    { href: "/kontak", label: t("nav.contacts") },
  ];

  return (
    <header className={`sticky top-0 z-40 ${isDark ? "dark-glass" : "glass"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" data-testid="nav-logo" className="flex items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${isDark ? "bg-white text-brand-ink" : "bg-brand-ink text-white"}`}>
            <Lightning weight="fill" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className={`font-display text-base font-extrabold tracking-tight ${isDark ? "text-white" : "text-brand-ink"}`}>Monican</div>
            <div className={`-mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-emerald-300" : "text-emerald-600"}`}>Recharge</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-testid={`nav-link-${l.href.replace("/", "") || "home"}`}
              className={`text-sm font-medium transition-colors ${linkBase} ${path === l.href ? (isDark ? "!text-white" : "!text-brand-ink") : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle dark={isDark} />
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button data-testid="logout-btn" variant={isDark ? "glass" : "outline"} size="sm" onClick={logout}>
                {t("nav.logout")}
              </Button>
            ) : (
              <>
                <Button asChild data-testid="login-btn" variant={isDark ? "glass" : "ghost"} size="sm">
                  <Link href="/konekte">{t("nav.login")}</Link>
                </Button>
                <Button asChild data-testid="signup-btn" variant="green" size="sm">
                  <Link href="/enskri">{t("nav.signup")}</Link>
                </Button>
              </>
            )}
          </div>
          <button
            data-testid="mobile-menu-btn"
            className={`md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full ${isDark ? "bg-white/10 text-white" : "bg-black/5 text-brand-ink"}`}
            onClick={() => setOpen(!open)}
            aria-label="menu"
          >
            {open ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-black/5 bg-white">
          <div className="space-y-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                data-testid={`mobile-nav-link-${l.href.replace("/", "") || "home"}`}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-brand-ink hover:bg-black/5"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 flex gap-2">
              {user ? (
                <Button data-testid="mobile-logout-btn" className="flex-1" variant="outline" onClick={logout}>{t("nav.logout")}</Button>
              ) : (
                <>
                  <Button asChild className="flex-1" variant="outline"><Link href="/konekte">{t("nav.login")}</Link></Button>
                  <Button asChild className="flex-1" variant="green"><Link href="/enskri">{t("nav.signup")}</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

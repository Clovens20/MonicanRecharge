"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "./ui/button";
import { Lightning, List, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavLink = { key: string; href: string; label: string };

function buildNavLinks(opts: {
  t: (k: string) => string;
  path: string;
  user: unknown;
  isAdmin: boolean;
  hasAgent: boolean;
  kesyeOk: boolean;
}): NavLink[] {
  const { t, path, user, isAdmin, hasAgent, kesyeOk } = opts;
  const logged = Boolean(user);
  const onAdmin = path.startsWith("/admin");
  const onRecharge = path.startsWith("/recharge");
  const onAgentHub = path.startsWith("/tableau-de-bord/ajan");
  const adminInAdminUi = isAdmin && onAdmin;

  const links: NavLink[] = [{ key: "home", href: "/", label: t("nav.home") }];

  if (onAdmin && isAdmin) {
    links.push({ key: "dash", href: "/admin", label: t("nav.dashboard_admin") });
  } else if (onRecharge) {
    links.push({ key: "dash-store", href: kesyeOk ? "/recharge#kesye-vente" : "/recharge", label: t("nav.dashboard_store") });
  } else if (onAgentHub) {
    links.push({ key: "dash-user", href: "/tableau-de-bord", label: t("nav.dashboard") });
    links.push({ key: "agent-hub", href: "/tableau-de-bord/ajan", label: t("nav.agent_dash") });
  } else if (logged && isAdmin) {
    links.push({ key: "dash", href: "/admin", label: t("nav.dashboard_admin") });
  } else if (logged) {
    links.push({ key: "dash", href: "/tableau-de-bord", label: t("nav.dashboard") });
  }

  if (onRecharge) {
    links.push({ key: "store-nip", href: "/recharge", label: t("nav.store_kesye") });
  }

  if (!adminInAdminUi && (logged || kesyeOk || onRecharge)) {
    links.push({ key: "hist", href: "/istwa", label: t("nav.history") });
  }

  links.push({ key: "contact", href: "/kontak", label: t("nav.contacts") });

  if (!hasAgent && !isAdmin) {
    links.push({ key: "be-agent", href: "/ajan", label: t("nav.agent") });
  }

  return links;
}

export function Navbar({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { t } = useLang();
  const path = usePathname() || "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<unknown>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAgent, setHasAgent] = useState(false);
  const [kesyeOk, setKesyeOk] = useState(false);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setHasAgent(false);
      return;
    }
    void fetch("/api/auth/nav-context")
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(Boolean(d?.admin));
        setHasAgent(Boolean(d?.agent));
      })
      .catch(() => {
        setIsAdmin(false);
        setHasAgent(false);
      });
  }, [user]);

  useEffect(() => {
    const run = () => {
      void fetch("/api/kesye/me", { credentials: "include" }).then((r) => setKesyeOk(r.ok));
    };
    const eager = path.startsWith("/recharge");
    if (eager) run();
    const idleId =
      !eager && typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(run, { timeout: 2000 })
        : null;
    const timerId = !eager && idleId === null ? window.setTimeout(run, 500) : null;
    const onKesye = () => run();
    window.addEventListener("monican-kesye-session", onKesye);
    return () => {
      window.removeEventListener("monican-kesye-session", onKesye);
      if (idleId !== null) cancelIdleCallback(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [path]);

  const links = useMemo(
    () => buildNavLinks({ t, path, user, isAdmin, hasAgent, kesyeOk }),
    [t, path, user, isAdmin, hasAgent, kesyeOk],
  );

  const clientCompactNav = useMemo(
    () => Boolean(user && !isAdmin && !path.startsWith("/admin") && !path.startsWith("/recharge")),
    [user, isAdmin, path],
  );

  async function logout() {
    const sb = createClient();
    if (!sb) return;
    await sb.auth.signOut();
    router.push("/");
  }

  const isDark = variant === "dark";
  const linkBase = isDark ? "text-white/80 hover:text-white" : "text-brand-ink/70 hover:text-brand-ink";

  return (
    <header className={`sticky top-0 z-40 ${isDark ? "dark-glass" : "glass"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={clientCompactNav ? "/tableau-de-bord" : "/"} data-testid="nav-logo" className="flex items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-xl ${isDark ? "bg-white text-brand-ink" : "bg-brand-ink text-white"}`}>
            <Lightning weight="fill" className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className={`font-display text-base font-extrabold tracking-tight ${isDark ? "text-white" : "text-brand-ink"}`}>Monican</div>
            <div className={`-mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-emerald-300" : "text-emerald-600"}`}>Recharge</div>
          </div>
        </Link>

        {clientCompactNav ? (
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={isDark ? "glass" : "outline"}
                  size="sm"
                  className={isDark ? "border-white/15 text-white" : ""}
                  data-testid="nav-client-menu-trigger"
                >
                  <List className="h-4 w-4 shrink-0" weight="bold" />
                  <span className="ml-2">{t("nav.menu")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {(user as { email?: string } | null)?.email ? (
                  <div className="truncate px-3 py-2 text-xs font-medium text-black/50">{(user as { email?: string }).email}</div>
                ) : null}
                {links.map((l) => {
                  const base = l.href.split("#")[0];
                  const isActive =
                    path === base ||
                    (l.key === "agent-hub" && path.startsWith("/tableau-de-bord/ajan")) ||
                    (l.key === "dash" && base === "/admin" && path.startsWith("/admin"));
                  return (
                    <DropdownMenuItem key={l.key} asChild className={isActive ? "bg-emerald-50 text-emerald-900" : ""}>
                      <Link href={l.href} data-testid={`nav-link-${l.key}`} prefetch={false}>
                        {l.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => {
              const base = l.href.split("#")[0];
              const isActive =
                path === base ||
                (l.key === "agent-hub" && path.startsWith("/tableau-de-bord/ajan")) ||
                (l.key === "dash" && base === "/admin" && path.startsWith("/admin"));
              return (
                <Link
                  key={l.key}
                  href={l.href}
                  prefetch={false}
                  data-testid={`nav-link-${l.key}`}
                  className={`text-sm font-medium transition-colors ${linkBase} ${
                    isActive ? (isDark ? "!text-white" : "!text-brand-ink") : ""
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <LanguageToggle dark={isDark} />
          <div className="hidden md:flex items-center gap-2">
            {isAdmin ? (
              <Button asChild variant="green" size="sm">
                <Link href="/admin" data-testid="nav-admin">
                  Admin
                </Link>
              </Button>
            ) : null}
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
                key={l.key}
                href={l.href}
                data-testid={`mobile-nav-link-${l.key}`}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-brand-ink hover:bg-black/5"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 flex flex-wrap gap-2">
              {isAdmin ? (
                <Button asChild className="flex-1" variant="green">
                  <Link href="/admin" onClick={() => setOpen(false)}>
                    Admin
                  </Link>
                </Button>
              ) : null}
              {user ? (
                <Button data-testid="mobile-logout-btn" className="flex-1" variant="outline" onClick={logout}>
                  {t("nav.logout")}
                </Button>
              ) : (
                <>
                  <Button asChild className="flex-1" variant="outline">
                    <Link href="/konekte">{t("nav.login")}</Link>
                  </Button>
                  <Button asChild className="flex-1" variant="green">
                    <Link href="/enskri">{t("nav.signup")}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

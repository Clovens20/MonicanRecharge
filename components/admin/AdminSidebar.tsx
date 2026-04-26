"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GearSix, SignOut, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_LINKS } from "@/lib/admin/nav-links";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageProvider";

type Props = {
  drawerOpen: boolean;
  onCloseDrawer: () => void;
};

function linkActive(path: string, href: string) {
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

export function AdminSidebar({ drawerOpen, onCloseDrawer }: Props) {
  const path = usePathname();
  const router = useRouter();
  const { t } = useLang();

  async function logout() {
    const sb = createClient();
    if (!sb) return;
    await sb.auth.signOut();
    router.push("/admin");
  }

  const nav = (
    <nav className="space-y-1">
      {ADMIN_NAV_LINKS.map((l) => (
        <Link
          key={l.key}
          href={l.href}
          prefetch={false}
          onClick={onCloseDrawer}
          className={cn(
            "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            linkActive(path, l.href) ? "bg-emerald-50 text-emerald-900" : "text-black/60 hover:bg-black/5 hover:text-brand-ink",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!drawerOpen}
        onClick={onCloseDrawer}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-56 overflow-y-auto border-r border-black/5 bg-white shadow-xl transition-transform duration-200 ease-out md:static md:z-0 md:h-auto md:min-h-[calc(100vh-4rem)] md:translate-x-0 md:shadow-none md:transition-none",
          drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex min-h-full flex-col p-4">
          <div className="flex items-center justify-between md:hidden">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-black/40">Admin</span>
            <button type="button" className="rounded-lg p-2 text-brand-ink hover:bg-black/5" aria-label="Fèmen" onClick={onCloseDrawer}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 hidden font-display text-sm font-black tracking-tight text-brand-ink md:block">Admin</div>
          <div className="mt-4">{nav}</div>
          <div className="mt-6 space-y-1 border-t border-black/5 pt-4">
            <Link
              href="/admin/paramet"
              prefetch={false}
              onClick={onCloseDrawer}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                linkActive(path, "/admin/paramet")
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-black/60 hover:bg-black/5 hover:text-brand-ink",
              )}
            >
              <GearSix className="h-4 w-4" weight="duotone" />
              <span>Paramèt</span>
            </Link>
            <button
              type="button"
              data-testid="admin-sidebar-logout"
              onClick={() => void logout()}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-black/60 transition-colors hover:bg-black/5 hover:text-brand-ink"
            >
              <SignOut className="h-4 w-4" weight="duotone" />
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

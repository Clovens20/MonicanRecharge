"use client";

import Link from "next/link";
import { List, Lightning } from "@phosphor-icons/react";
import { LanguageToggle } from "@/components/LanguageToggle";

type Props = { onOpenSidebar: () => void };

export function AdminHeader({ onOpenSidebar }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white">
      <div className="mx-auto flex h-16 max-w-[100vw] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-brand-bg text-brand-ink md:hidden"
          aria-label="Menu admin"
          onClick={onOpenSidebar}
        >
          <List className="h-5 w-5" weight="bold" />
        </button>

        <Link href="/admin" className="flex min-w-0 items-center gap-2" data-testid="admin-header-logo">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-ink text-white">
            <Lightning weight="fill" className="h-5 w-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="font-display text-sm font-extrabold tracking-tight text-brand-ink">Monican</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Admin</div>
          </div>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-2">
          <LanguageToggle iconOnly />
        </div>
      </div>
    </header>
  );
}

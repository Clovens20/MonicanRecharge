"use client";

import { LANGS, Lang } from "@/lib/i18n/translations";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Globe, ChevronDown } from "lucide-react";

export function LanguageToggle({ dark = false, iconOnly = false }: { dark?: boolean; iconOnly?: boolean }) {
  const { lang, setLang } = useLang();
  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="lang-toggle"
        className={`inline-flex items-center gap-2 rounded-full border px-3 h-10 text-xs font-semibold transition-colors ${
          dark
            ? "bg-white/10 border-white/15 text-white hover:bg-white/15"
            : "bg-white border-black/10 text-brand-ink hover:bg-black/5"
        }`}
        aria-label="Langue"
      >
        <Globe className="h-3.5 w-3.5" />
        {!iconOnly ? <span className="text-base leading-none">{current.flag}</span> : null}
        {!iconOnly ? <span className="tracking-[0.12em]">{current.label}</span> : null}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            data-testid={`lang-toggle-${l.code}`}
            onClick={() => setLang(l.code as Lang)}
            className={lang === l.code ? "bg-black/5" : ""}
          >
            <span className="text-lg leading-none">{l.flag}</span>
            <span className="tracking-[0.12em]">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

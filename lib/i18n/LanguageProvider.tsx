"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Lang, tr } from "./translations";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<Ctx | null>(null);
const SHARED_KEY = "monican_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("kr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem(SHARED_KEY) as Lang) || null;
    if (saved && ["en", "fr", "es", "kr"].includes(saved)) {
      setLangState(saved);
    } else {
      const nav = navigator.language?.toLowerCase() || "";
      if (nav.startsWith("ht") || nav.startsWith("kr")) setLangState("kr");
      else if (nav.startsWith("fr")) setLangState("fr");
      else if (nav.startsWith("es")) setLangState("es");
      else setLangState("en");
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(SHARED_KEY, l);
      try {
        window.dispatchEvent(new CustomEvent("monican_lang_change", { detail: l }));
      } catch {}
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: (k) => tr(k, lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

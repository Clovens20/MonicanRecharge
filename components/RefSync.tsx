"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const LS_KEY = "monican_ref";
const LS_CREF = "monican_cref";

function cleanRef(raw: string | null): string | null {
  if (!raw) return null;
  const c = raw.trim().replace(/[^A-Za-z0-9\-_]/g, "").slice(0, 32);
  return c.length >= 4 ? c : null;
}

/** Synchronise ?ref= → localStorage (complément au cookie posé par middleware). */
export function RefSync() {
  const sp = useSearchParams();
  useEffect(() => {
    const c = cleanRef(sp.get("ref"));
    if (c) {
      try {
        localStorage.setItem(LS_KEY, c);
      } catch {}
    }
    const cref = cleanRef(sp.get("cref"));
    if (cref) {
      try {
        localStorage.setItem(LS_CREF, cref);
      } catch {}
    }
  }, [sp]);
  return null;
}

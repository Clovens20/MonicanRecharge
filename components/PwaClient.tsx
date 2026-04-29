"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/LanguageProvider";

const VISITED_KEY = "visited_count";
const LEGACY_VISITS = "monican_visit_count";
const DISMISSED = "monican_pwa_dismissed";

type BeforeInstallPromptLike = Event & { prompt: () => Promise<{ outcome?: string }> };

function readVisitCount(): number {
  try {
    const v = localStorage.getItem(VISITED_KEY);
    if (v != null) return parseInt(v, 10) || 0;
    const legacy = localStorage.getItem(LEGACY_VISITS);
    if (legacy != null) {
      const n = parseInt(legacy, 10) || 0;
      localStorage.setItem(VISITED_KEY, String(n));
      return n;
    }
  } catch {}
  return 0;
}

function PwaClient() {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<BeforeInstallPromptLike | null>(null);
  const [show, setShow] = useState(false);
  const [visitOk, setVisitOk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptLike);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    try {
      const prev = readVisitCount();
      const n = prev + 1;
      localStorage.setItem(VISITED_KEY, String(n));
      const ok = n >= 2;
      setVisitOk(ok);
      const dismissed = localStorage.getItem(DISMISSED) === "1";
      if (ok && !dismissed) setShow(true);
    } catch {
      setVisitOk(false);
    }

    const openFromLanding = () => {
      try {
        const n = parseInt(localStorage.getItem(VISITED_KEY) || "0", 10);
        if (n >= 2) setShow(true);
      } catch {}
    };
    window.addEventListener("monican-open-pwa-banner", openFromLanding);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("monican-open-pwa-banner", openFromLanding);
    };
  }, []);

  async function install() {
    if (!deferred) {
      window.open("/", "_self");
      return;
    }
    await deferred.prompt();
    setDeferred(null);
    setShow(false);
  }

  if (!visitOk) return null;
  if (!show && !deferred) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-xl sm:left-auto sm:right-4 sm:mx-0">
      <p className="text-sm font-semibold text-brand-ink">{t("pwa.install_cta")}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="green" size="sm" className="flex-1" onClick={() => void install()}>
          {t("pwa.install_btn")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            try {
              localStorage.setItem(DISMISSED, "1");
            } catch {}
            setShow(false);
            setDeferred(null);
          }}
        >
          {t("pwa.install_dismiss")}
        </Button>
      </div>
    </div>
  );
}

export { PwaClient };
export default PwaClient;

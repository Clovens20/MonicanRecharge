"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/LanguageProvider";

const VISITS = "monican_visit_count";
const DISMISSED = "monican_pwa_dismissed";

type BeforeInstallPromptLike = Event & { prompt: () => Promise<{ outcome?: string }> };

function PwaClient() {
  const { t } = useLang();
  const [deferred, setDeferred] = useState<BeforeInstallPromptLike | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Evite les chunks obsolètes en dev: désenregistre tous les SW.
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
      const n = parseInt(localStorage.getItem(VISITS) || "0", 10) + 1;
      localStorage.setItem(VISITS, String(n));
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const dismissed = localStorage.getItem(DISMISSED) === "1";
      if (mobile && n >= 2 && !dismissed) setShow(true);
    } catch {}

    const openFromLanding = () => setShow(true);
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

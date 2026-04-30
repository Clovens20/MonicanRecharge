"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isAdminEmailClient } from "@/lib/auth/admin-client";

export default function AuthKonpletePage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Chajman…");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      router.replace("/konekte");
      return;
    }
    const sb = createClient();
    if (!sb) {
      router.replace("/konekte");
      return;
    }
    void sb.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      if (!email) {
        setMsg("Pa gen sesyon — konekte ankò.");
        router.replace("/konekte");
        return;
      }
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const nextRaw = sp.get("next");
      const nextSafe =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") && !nextRaw.includes("://") ? nextRaw : null;
      if (isAdminEmailClient(email)) router.replace("/admin");
      else router.replace(nextSafe || "/tableau-de-bord");
    });
  }, [router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center bg-brand-bg px-4">
      <p className="text-sm text-black/50">{msg}</p>
    </main>
  );
}

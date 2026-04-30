"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ReloadlyAdminStrip } from "@/components/admin/ReloadlyAdminStrip";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmailClient } from "@/lib/auth/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function refreshAccess() {
    setLoading(true);
    try {
      const r = await fetch("/api/auth/is-admin", { credentials: "include", cache: "no-store" });
      const d = await r.json();
      setAdminOk(Boolean(d.admin));
    } catch {
      setAdminOk(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const sb = createClient();
      if (sb) {
        const { data: sess } = await sb.auth.getSession();
        if (cancelled) return;
        const mail = sess.session?.user?.email;
        if (mail && isAdminEmailClient(mail)) {
          setAdminOk(true);
          setLoading(false);
        }
      }
      if (cancelled) return;
      try {
        const r = await fetch("/api/auth/is-admin", { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        const d = await r.json();
        setAdminOk(Boolean(d.admin));
      } catch {
        if (!cancelled) setAdminOk(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loginAdmin(e: React.FormEvent) {
    e.preventDefault();
    const sb = createClient();
    if (!sb) return;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return toast.error(error.message);
    const r = await fetch("/api/auth/is-admin", { credentials: "include" });
    const d = await r.json();
    if (!d.admin) {
      await sb.auth.signOut();
      return toast.error("Ou pa admin Recharge");
    }
    toast.success("Byenvini admin");
    setAdminOk(true);
    setPassword("");
    router.refresh();
  }

  async function forgotPassword() {
    if (!email.trim()) {
      toast.error("Mete email la anvan");
      return;
    }
    const sb = createClient();
    if (!sb) return;
    const redirectTo = `${window.location.origin}/auth/konplete`;
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) return toast.error(error.message);
    toast.success("Lyen reset voye sou email la");
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-brand-bg p-4">
        <div className="rounded-2xl border border-black/10 bg-white px-6 py-4 text-sm">Loading admin...</div>
      </main>
    );
  }

  if (!adminOk) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <div className="mx-auto flex max-w-lg justify-end px-4 pt-4">
          <LanguageToggle iconOnly />
        </div>
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h1 className="font-display text-2xl font-black text-brand-ink">Admin Recharge</h1>
            <p className="mt-1 text-sm text-black/55">Konekte ak imèl + modpas admin.</p>
            <form className="mt-5 grid gap-3" onSubmit={loginAdmin}>
              <Input type="email" placeholder="Email admin" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" variant="green">
                Konekte admin
              </Button>
              <Button type="button" variant="outline" onClick={() => void forgotPassword()}>
                Mot de passe oubli\u00e9
              </Button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <AdminHeader onOpenSidebar={() => setDrawerOpen(true)} />
      <ReloadlyAdminStrip />
      <div className="flex min-h-[calc(100vh-4rem)] bg-brand-bg">
        <AdminSidebar drawerOpen={drawerOpen} onCloseDrawer={() => setDrawerOpen(false)} />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</div>
      </div>
    </>
  );
}

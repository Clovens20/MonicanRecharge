"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AgentMeta = { non: string | null; kòd: string | null; imèl: string | null };

function passwordOk(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p);
}

export default function AjanByenveniPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [boot, setBoot] = useState(true);
  const [error, setError] = useState("");
  const [agentInfo, setAgentInfo] = useState<AgentMeta | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setBoot(false);
      setError("Konfigirasyon Supabase manke.");
      return;
    }
    const sb = createClient();
    if (!sb) {
      setBoot(false);
      setError("Kliyan Supabase pa disponib.");
      return;
    }

    async function run() {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exErr } = await sb.auth.exchangeCodeForSession(code);
        if (exErr) {
          setError(exErr.message);
          setBoot(false);
          return;
        }
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.hash);
      }

      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session?.user) {
        setError("Pa gen sesyon envitasyon. Sèvi ak lyen nan imèl ou a, oswa konekte.");
        setBoot(false);
        return;
      }
      const md = session.user.user_metadata as Record<string, string | undefined> | undefined;
      setAgentInfo({
        non: md?.full_name ?? md?.non_konplè ?? null,
        kòd: md?.kòd_ajan ?? null,
        imèl: session.user.email ?? null,
      });
      setBoot(false);
    }

    void run();
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!passwordOk(password)) {
      setError("Modpas dwe gen omwen 8 karaktè, 1 majiskil, ak 1 chif.");
      return;
    }
    if (password !== confirm) {
      setError("Modpas yo pa matche.");
      return;
    }
    const sb = createClient();
    if (!sb) return;
    setLoading(true);
    try {
      const { error: upErr } = await sb.auth.updateUser({
        password,
        data: { must_change_password: false, password_changed_at: new Date().toISOString() },
      });
      if (upErr) throw upErr;
      router.push("/agent?nouvo=1");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erè — eseye ankò.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (boot) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <Navbar mode="agent" />
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-black/50">Chajman…</div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar mode="agent" />
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-700">
            ⚡
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-ink">Byenveni kòm Ajan!</h1>
          {agentInfo?.kòd ? (
            <p className="mt-2 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 font-mono text-sm font-bold text-emerald-800">
              {agentInfo.kòd}
            </p>
          ) : null}
          {agentInfo?.non ? (
            <p className="mt-3 text-sm text-black/55">
              Bonjou {agentInfo.non}! Kreye modpas ou pou kòmanse.
            </p>
          ) : (
            <p className="mt-3 text-sm text-black/55">Kreye modpas ou pou kòmanse.</p>
          )}
        </div>

        <form
          onSubmit={handleSetPassword}
          className="mt-10 space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(17,24,39,0.2)]"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="pw">Modpas nouvo</Label>
            <Input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Omwen 8 karaktè"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pw2">Konfime modpas</Label>
            <Input
              id="pw2"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repete modpas la"
              required
              autoComplete="new-password"
            />
          </div>
          <ul className="space-y-1 text-xs text-black/45">
            <li className={password.length >= 8 ? "text-emerald-700" : ""}>
              {password.length >= 8 ? "✓" : "○"} Omwen 8 karaktè
            </li>
            <li className={/[A-Z]/.test(password) ? "text-emerald-700" : ""}>
              {/[A-Z]/.test(password) ? "✓" : "○"} 1 lèt majiskil
            </li>
            <li className={/[0-9]/.test(password) ? "text-emerald-700" : ""}>
              {/[0-9]/.test(password) ? "✓" : "○"} 1 chif
            </li>
          </ul>
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
          ) : null}
          <Button
            type="submit"
            variant="green"
            className="w-full"
            disabled={loading || !passwordOk(password) || password !== confirm}
          >
            {loading ? "N ap anrejistre…" : "Kòmanse kòm Ajan →"}
          </Button>
        </form>
      </section>
      <Footer />
    </main>
  );
}

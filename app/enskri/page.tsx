"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { toast } from "sonner";
import { GoogleLogo, ShieldCheck } from "@phosphor-icons/react";

/** Lyen nan imèl Supabase — dwe matche Redirect URLs (souvan menm origin ke paj la). */
function authCompleteRedirect(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/konplete`;
}

export default function SignupPage() {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [configured, setConfigured] = useState(true);
  /** Imèl voye, itilizatè dwe klike lyen an (lè konfirmasyon aktif sou Supabase). */
  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => setConfigured(isSupabaseConfigured()), []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      toast.error("Supabase not configured");
      return;
    }
    const sb = createClient();
    if (!sb) return;
    setLoading(true);
    const emailRedirectTo = authCompleteRedirect();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: emailRedirectTo || undefined,
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);

    if (data.session) {
      toast.success(t("auth.signup_confirm_title"));
      router.push("/tableau-de-bord");
      router.refresh();
      return;
    }

    if (data.user) {
      setPendingConfirm(true);
      toast.success(t("auth.signup_toast_sent"));
      return;
    }

    toast.error("Erè enskripsyon");
  }

  async function handleResend() {
    const sb = createClient();
    if (!sb || !email) return;
    setResendLoading(true);
    const emailRedirectTo = authCompleteRedirect();
    const { error } = await sb.auth.resend({
      type: "signup",
      email,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    setResendLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.signup_resend_ok"));
  }

  async function handleGoogle() {
    if (!configured) return toast.error("Supabase not configured");
    const sb = createClient();
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/konplete` },
    });
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="hidden lg:block">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">— Enskri</div>
          <h1 className="font-display mt-3 text-5xl font-black leading-tight tracking-tight">
            {t("auth.signup_title")}
          </h1>
          <p className="mt-4 max-w-md text-black/60">
            Yon kont pou voye recharge bay fanmi w, zanmi, kòlèg — kote ou ye nan mond lan.
          </p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <ShieldCheck weight="fill" className="h-5 w-5 text-emerald-600" />
            <p className="text-xs text-emerald-700">Sekirite premye klas — peman ak kat (Stripe)</p>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_30px_80px_-30px_rgba(17,24,39,0.25)]">
          <h2 className="font-display text-2xl font-bold tracking-tight">{t("auth.signup_title")}</h2>

          {!configured && (
            <div data-testid="supabase-warning" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️ Supabase keys not configured.
            </div>
          )}

          {pendingConfirm ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-950">
              <p className="font-display text-lg font-bold">{t("auth.signup_confirm_title")}</p>
              <p className="leading-relaxed text-emerald-900/90">{t("auth.signup_confirm_body")}</p>
              <p className="rounded-xl bg-white/80 p-3 font-mono text-xs text-brand-ink">{email}</p>
              <p className="text-xs leading-relaxed text-emerald-800/85">{t("auth.signup_smtp_hint")}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="green" size="sm" disabled={resendLoading} onClick={() => void handleResend()}>
                  {resendLoading ? "…" : t("auth.signup_resend")}
                </Button>
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href="/konekte">{t("auth.signup_go_login")}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="mt-6 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">{t("auth.full_name")}</Label>
                <Input data-testid="signup-name" id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Pyè" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input data-testid="signup-email" id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@monican.shop" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input data-testid="signup-password" id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>
              <Button data-testid="signup-submit" type="submit" variant="green" size="lg" disabled={loading}>
                {loading ? "…" : t("nav.signup")}
              </Button>
            </form>
          )}

          {!pendingConfirm && (
            <>
              <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/30">
                <div className="h-px flex-1 bg-black/10" /> OR <div className="h-px flex-1 bg-black/10" />
              </div>

              <Button data-testid="signup-google" onClick={handleGoogle} variant="outline" size="lg" className="w-full" disabled={!configured}>
                <GoogleLogo weight="bold" className="h-5 w-5" /> {t("auth.google")}
              </Button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-black/60">
            {t("auth.have_account")}{" "}
            <Link data-testid="link-login" href="/konekte" className="font-semibold text-emerald-700 hover:underline">
              {t("nav.login")}
            </Link>
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}

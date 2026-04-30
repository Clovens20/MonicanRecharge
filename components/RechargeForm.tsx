"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle,
  Phone,
  CreditCard,
  Wallet,
  Lightning,
  ArrowRight,
  ArrowLeft,
  Globe,
  Sparkle,
} from "@phosphor-icons/react";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { OPERATORS, DATA_PLANS, QUICK_AMOUNTS, detectOperator, Operator } from "@/lib/reloadly/mock";
import {
  RECHARGE_COUNTRIES,
  nationalDigits,
  inferCountryAndNational,
  shouldAutoPickCountryFromPhone,
} from "@/lib/reloadly/countries";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { addTx, TxLocal } from "@/lib/store";
import { cn, formatCurrency, formatHTG } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ReceiptSuccessPanel } from "@/components/ReceiptSuccessPanel";
import { getCashierName } from "@/lib/receipt/caisse";
import { tryOpenCashDrawer } from "@/lib/receipt/caisse";

export function RechargeForm({
  compact = false,
  commissionPct,
  agentRefCode,
  visualMode = "default",
  showReceiptPanel = true,
}: {
  compact?: boolean;
  /** Si defini (tablo ajan), afiche mesaj komisyon sou etap 4. */
  commissionPct?: number | null;
  /** Kòd pèsonèl ajan pou atribye komisyon sou vann dirèk (tablo ajan). */
  agentRefCode?: string | null;
  /** Style sombre / glass pour la landing uniquement — logique inchangée. */
  visualMode?: "default" | "landing";
  /** Panel reçus (print / WhatsApp / email) : utile surtout pour caisse/agent. */
  showReceiptPanel?: boolean;
}) {
  const { t, lang } = useLang();
  const L = visualMode === "landing";
  const router = useRouter();
  const pathname = usePathname();
  /** Toujours `true` au 1er rendu (SSR + hydratation) ; valeur réelle après mount dans useEffect. */
  const [online, setOnline] = useState(true);
  const [kesyeOk, setKesyeOk] = useState(false);
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState(RECHARGE_COUNTRIES[0]!);
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [detectingOperator, setDetectingOperator] = useState(false);
  const [type, setType] = useState<"airtime" | "data_plan">("airtime");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "cash">("stripe");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [successTx, setSuccessTx] = useState<TxLocal | null>(null);
  const [cashierForReceipt, setCashierForReceipt] = useState("");

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine !== false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/recharge")) {
      setKesyeOk(false);
      return;
    }
    void fetch("/api/kesye/me", { credentials: "include" }).then((r) => setKesyeOk(r.ok));
  }, [pathname]);

  const isStoreUi = pathname?.startsWith("/recharge");

  /** Étape 2 : pays déduit de +33, +509, 00…, ou 509xxxxxxxx (Haïti). Ne remplace pas un pays +1 par un autre (US/CA/DO…). */
  useEffect(() => {
    if (step !== 2) return;
    if (!shouldAutoPickCountryFromPhone(phone)) return;
    const tid = window.setTimeout(() => {
      const inferred = inferCountryAndNational(phone);
      if (!inferred || inferred.country.code === country.code) return;
      if (inferred.country.dial === "+1" && country.dial === "+1") return;
      setCountry(inferred.country);
    }, 180);
    return () => window.clearTimeout(tid);
  }, [phone, step, country.code, country.dial]);

  /** Étape 2 : Haïti = détection locale ; autres pays = Reloadly auto-detect (API) ou mock. */
  useEffect(() => {
    if (step !== 2) return;
    if (country.code === "HT") setDetectingOperator(false);
    const digits = nationalDigits(phone, country.dial);

    if (country.code === "HT") {
      if (digits.length >= 4) setOperator(detectOperator(phone, "HT"));
      return;
    }

    if (digits.length < 7) {
      setOperator(null);
      return;
    }

    const ac = new AbortController();
    const tid = window.setTimeout(async () => {
      setDetectingOperator(true);
      try {
        const r = await fetch("/api/reloadly/auto-detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: digits, countryCode: country.code }),
          signal: ac.signal,
        });
        const rawText = await r.text();
        let j: { operator?: { id: number; name: string; logoUrl?: string | null; countryCode?: string } } = {};
        try {
          j = JSON.parse(rawText) as typeof j;
        } catch {
          j = {};
        }

        const applyDetected = (id: number, name: string, logoUrl?: string | null) => {
          const row = RECHARGE_COUNTRIES.find((c) => c.code === country.code);
          setOperator({
            id,
            name,
            countryCode: country.code,
            countryName: row?.name || country.code,
            flag: row?.flag || "🌍",
            logoUrl: logoUrl || "/operators/orange.svg",
            fxRate: 1,
            currency: "USD",
            prefixes: [],
            type: "airtime",
          });
        };

        if (j.operator && typeof j.operator.id === "number" && j.operator.name) {
          applyDetected(j.operator.id, j.operator.name, j.operator.logoUrl);
        } else {
          const local = detectOperator(digits, country.code);
          if (local) {
            applyDetected(local.id, local.name, local.logoUrl);
          } else {
            setOperator(null);
          }
        }
      } catch {
        if (!ac.signal.aborted) setOperator(null);
      } finally {
        if (!ac.signal.aborted) setDetectingOperator(false);
      }
    }, 450);
    return () => {
      ac.abort();
      window.clearTimeout(tid);
    };
  }, [step, phone, country.code, country.dial]);

  const finalAmount = useMemo(() => {
    if (type === "data_plan" && plan) {
      const p = DATA_PLANS.find((x) => x.id === plan);
      return p?.priceUsd || 0;
    }
    if (amount) return amount;
    const c = parseFloat(customAmount);
    return isNaN(c) ? 0 : c;
  }, [type, amount, customAmount, plan]);

  const nationalPhone = useMemo(() => nationalDigits(phone, country.dial), [phone, country.dial]);
  const phoneStep2Ok = country.code === "HT" ? nationalPhone.length >= 4 : nationalPhone.length >= 7;

  const filteredPlans = operator ? DATA_PLANS.filter((p) => p.operatorId === operator.id) : [];

  function detectedLine(op: Operator) {
    if (!L) return `${t("form.detected")}: ${op.name}`;
    const suffix =
      lang === "fr" ? "détecté" : lang === "es" ? "detectado" : lang === "kr" ? "detekte" : "detected";
    return `✅ ${op.name} ${suffix}`;
  }

  function selectOperatorCard(opId: number) {
    const op = OPERATORS.find((o) => o.id === opId);
    if (op) {
      setOperator(op);
      setCountry(RECHARGE_COUNTRIES.find((c) => c.code === op.countryCode) || RECHARGE_COUNTRIES[0]!);
      setStep(2);
    }
  }

  function operatorMetaPayload() {
    if (!operator) return {};
    return {
      operatorDisplayName: operator.name,
      operatorCurrency: operator.currency,
      operatorFxRate: operator.fxRate,
      operatorLogoUrl: operator.logoUrl,
    };
  }

  /** Stripe Checkout via API Next (.env STRIPE_SECRET_KEY) — la recharge part après webhook Stripe. */
  async function startStripeCheckout() {
    if (!operator || !finalAmount) return;
    const res = await fetch("/api/recharge/stripe-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        operatorId: operator.id,
        operatorName: operator.name,
        recipientPhone: nationalPhone,
        countryCode: country.code,
        amount: finalAmount,
        tip: type === "data_plan" ? "data_plan" : "airtime",
        planId: type === "data_plan" && plan ? plan : undefined,
        ...operatorMetaPayload(),
      }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (res.status === 401) {
      toast.error(t("form.stripe_login_required"));
      const next = pathname?.startsWith("/") && !pathname.startsWith("//") ? pathname : "/";
      router.push(`/konekte?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!res.ok || !data.url) {
      throw new Error(data.error || t("form.stripe_checkout_error"));
    }
    window.location.assign(data.url);
  }

  async function handleSubmit() {
    if (!operator || !phone || !finalAmount) {
      toast.error("Please complete all steps");
      return;
    }
    setSubmitting(true);
    try {
      let refKod: string | null = null;
      try {
        refKod = localStorage.getItem("monican_ref");
      } catch {}
      const refFinal = (refKod || agentRefCode || "").trim() || undefined;

      const isCaisse = Boolean(pathname?.startsWith("/recharge") && kesyeOk);
      const channelHint = isCaisse ? ("caisse" as const) : undefined;

      if (paymentMethod === "stripe") {
        await startStripeCheckout();
        return;
      }

      const res = await fetch("/api/recharge/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: operator.id,
          recipientPhone: { countryCode: country.code, number: nationalDigits(phone, country.dial) },
          amount: finalAmount,
          type,
          planId: plan,
          paymentMethod: "cash",
          userEmail: user?.email || null,
          refKod: refFinal,
          channelHint,
          ...operatorMetaPayload(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");

      if (isCaisse && paymentMethod === "cash") {
        // Tentative ouverture tiroir (ZHONGJI/ESC-POS) après vente cash validée.
        void tryOpenCashDrawer();
      }

      const tx: TxLocal = {
        id: data.id,
        reference: data.reference,
        user_email: user?.email || null,
        operator: operator.name,
        operator_id: operator.id,
        flag: operator.flag,
        country_code: country.code,
        recipient: `${country.dial} ${phone}`,
        amount_usd: finalAmount,
        amount_local: finalAmount * operator.fxRate,
        currency: operator.currency,
        type,
        plan: plan ? DATA_PLANS.find((p) => p.id === plan)?.name : null,
        status: "siksè",
        payment_method: paymentMethod,
        created_at: new Date().toISOString(),
      };
      addTx(tx);
      toast.success(t("status.success"));
      const ca =
        (typeof window !== "undefined" ? getCashierName() : "") ||
        (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CAISSE_DEFAULT_NAME : "") ||
        "—";
      setCashierForReceipt(ca);
      if (showReceiptPanel) {
        setSuccessTx(tx);
        setStep(5);
      } else {
        // Landing/public flow: on garde la recharge, sans afficher le panel reçu caisse.
        setPhone("");
        setOperator(null);
        setAmount(null);
        setCustomAmount("");
        setPlan(null);
        setStep(1);
      }
    } catch (e: any) {
      toast.error(e.message || t("status.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  function finishReceiptAndLeave() {
    setSuccessTx(null);
    setStep(1);
    setPhone("");
    setOperator(null);
    setAmount(null);
    setCustomAmount("");
    setPlan(null);
    router.push("/tableau-de-bord");
  }

  const stepDots = [1, 2, 3, 4];

  return (
    <div
      data-testid="recharge-form"
      className={cn(
        "relative",
        L ? "mx-auto w-full max-w-2xl text-slate-200" : cn("text-brand-ink", !compact && "mx-auto w-full max-w-xl"),
      )}
    >
      {!online ? (
        <div
          className={cn(
            "mb-3 rounded-2xl border px-4 py-3 text-center text-sm font-semibold",
            L ? "border-amber-500/40 bg-amber-500/15 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-950",
          )}
        >
          {t("pwa.offline_hint")}
        </div>
      ) : null}
      <div
        className={cn(
          "rounded-3xl border p-2",
          L
            ? "border-white/10 bg-white/[0.06] text-slate-200 shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_100px_rgba(0,208,132,0.06)] backdrop-blur-xl"
            : "border-black/5 bg-white text-brand-ink shadow-[0_30px_80px_-20px_rgba(17,24,39,0.4)]",
        )}
      >
        {/* Step indicator */}
            {step === 5 ? (
          <div
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl px-4 py-3",
              L ? "bg-emerald-500/15 text-emerald-100" : "bg-emerald-50 text-emerald-900",
            )}
          >
            <CheckCircle weight="fill" className="h-6 w-6 shrink-0" />
            <span className={cn("text-sm font-bold tracking-tight", L ? "font-landing-display" : "font-display")}>
              {t("receipt.title")}
            </span>
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center justify-between rounded-2xl px-4 py-3",
              L ? "border border-white/10 bg-white/5" : "bg-brand-bg",
            )}
          >
            <div className="flex items-center gap-2">
              {stepDots.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all",
                      step >= s
                        ? L
                          ? "bg-[#00D084] text-white shadow-[0_0_20px_rgba(0,208,132,0.35)]"
                          : "bg-brand-ink text-white"
                        : L
                          ? "bg-white/10 text-slate-400 ring-1 ring-white/10"
                          : "bg-white text-black/40 ring-1 ring-black/10",
                    )}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div className={cn("h-px w-6", step > s ? (L ? "bg-[#00D084]/80" : "bg-brand-ink") : L ? "bg-white/10" : "bg-black/10")} />
                  )}
                </div>
              ))}
            </div>
            {L ? (
              <div className="flex flex-col items-end gap-0.5 text-right">
                <div className="hidden max-w-[13rem] text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-slate-400 sm:block">
                  {t("landing.steps_label")}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">STEP {step}/4</div>
              </div>
            ) : (
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">STEP {step}/4</div>
            )}
          </div>
        )}

        <div className={cn("p-5 sm:p-7", L && "sm:px-12 sm:py-12")}>
          <AnimatePresence mode="wait">
            {/* STEP 1 — operator */}
            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", L ? "text-slate-400" : "text-black/50")}>
                  STEP 1
                </div>
                <h3 className={cn("mt-1 text-2xl font-bold tracking-tight", L ? "font-landing-display text-white" : "font-display")}>
                  {t("form.step1")}
                </h3>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {OPERATORS.filter((o) => o.countryCode === "HT").map((op) => {
                    const dig = op.id === 173;
                    const nat = op.id === 528;
                    return (
                      <button
                        key={op.id}
                        data-testid={`op-card-${op.id}`}
                        onClick={() => selectOperatorCard(op.id)}
                        className={cn(
                          "group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                          L && dig && "border-white/10 bg-gradient-to-br from-[#FF0000] to-[#CC0000] text-white shadow-lg hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,0,0,0.35)]",
                          L && nat && "border-white/10 bg-gradient-to-br from-[#003087] to-[#001F5C] text-white shadow-lg hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(0,48,135,0.4)]",
                          !L && "border-black/5 bg-white hover:border-emerald-400 hover:shadow-[0_8px_24px_-12px_rgba(16,185,129,0.4)]",
                        )}
                      >
                        <div
                          className={cn(
                            "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl",
                            L ? "bg-white/15" : "bg-brand-bg",
                          )}
                        >
                          {dig || nat ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={op.logoUrl} alt="" className="h-8 w-auto max-w-[2.5rem] object-contain brightness-0 invert" />
                          ) : (
                            op.flag
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("font-bold tracking-tight", L ? "font-landing-display" : "font-display")}>{op.name}</div>
                          <div className={cn("text-xs", L ? "text-white/80" : "text-black/50")}>
                            {op.flag} {op.countryName} · {t("landing.op_airtime_data")}
                          </div>
                        </div>
                        <ArrowRight
                          className={cn(
                            "h-5 w-5 shrink-0 transition-all group-hover:translate-x-1",
                            L ? "text-white/70 group-hover:text-white" : "text-black/30 group-hover:text-emerald-500",
                          )}
                        />
                      </button>
                    );
                  })}
                  <button
                    data-testid="op-card-other"
                    type="button"
                    onClick={() => {
                      setOperator(null);
                      setPhone("");
                      setCountry(RECHARGE_COUNTRIES.find((c) => c.code === "US") || RECHARGE_COUNTRIES[0]!);
                      setStep(2);
                    }}
                    className={cn(
                      "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                      L
                        ? "border-white/10 bg-gradient-to-br from-[#1E3A5F] to-[#0F2040] text-white hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(124,58,237,0.25)]"
                        : "border-dashed border-black/15 bg-white hover:border-brand-ink",
                    )}
                  >
                    <div className={cn("grid h-12 w-12 place-items-center rounded-xl text-lg", L ? "bg-white/10" : "bg-brand-bg")}>
                      <Globe className={cn("h-6 w-6", L ? "text-white" : "text-brand-ink")} />
                    </div>
                    <div className="flex-1">
                      <div className={cn("font-bold tracking-tight", L ? "font-landing-display" : "font-display")}>{t("landing.op_other_title")}</div>
                      <div className={cn("text-xs", L ? "text-white/75" : "text-black/50")}>{t("landing.op_other_sub")}</div>
                    </div>
                    <ArrowRight className={cn("h-5 w-5 group-hover:translate-x-1", L ? "text-white/70" : "text-black/30")} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — phone */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", L ? "text-slate-400" : "text-black/50")}>STEP 2</div>
                <h3 className={cn("mt-1 text-2xl font-bold tracking-tight", L ? "font-landing-display text-white" : "font-display")}>{t("form.step2")}</h3>
                <p className={cn("mt-1 text-sm", L ? "text-slate-400" : "text-black/50")}>{t("form.phone")}</p>

                <div className="mt-5 grid gap-3">
                  <div className="flex gap-2">
                    <select
                      data-testid="country-select"
                      value={country.code}
                      onChange={(e) => {
                        const c = RECHARGE_COUNTRIES.find((x) => x.code === e.target.value);
                        if (c) setCountry(c);
                      }}
                      className={cn(
                        "h-12 min-w-[10.5rem] shrink-0 rounded-xl border px-3 text-base font-semibold focus:outline-none focus:ring-4",
                        L
                          ? "border-white/20 bg-[#0F172A] text-slate-100 shadow-inner [color-scheme:dark] focus:border-[#00D084] focus:ring-[#00D084]/25"
                          : "border-black/10 bg-white text-brand-ink focus:border-brand-green focus:ring-emerald-100",
                      )}
                    >
                      {RECHARGE_COUNTRIES.map((c) => (
                        <option
                          key={c.code}
                          value={c.code}
                          className={L ? "bg-[#0F172A] text-slate-100" : "bg-white text-brand-ink"}
                          style={
                            L
                              ? ({ backgroundColor: "#0F172A", color: "#f1f5f9" } as React.CSSProperties)
                              : ({ backgroundColor: "#ffffff", color: "#0f172a" } as React.CSSProperties)
                          }
                        >
                          {c.flag} {c.name} · {c.dial}
                        </option>
                      ))}
                    </select>
                    <Input
                      data-testid="phone-input"
                      type="tel"
                      inputMode="tel"
                      placeholder={country.code === "HT" ? t("form.phone_placeholder") : t("form.phone_placeholder_intl")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoFocus
                      className={
                        L
                          ? "border-white/15 bg-white/10 text-white placeholder:text-slate-500 focus:border-[#00D084] focus:ring-[#00D084]/25"
                          : undefined
                      }
                    />
                  </div>
                  <p className={cn("text-[11px] leading-snug", L ? "text-slate-500" : "text-black/45")}>{t("form.country_auto_hint")}</p>

                  <div className="min-h-[44px]">
                    {detectingOperator && country.code !== "HT" ? (
                      <div className={cn("text-xs font-medium", L ? "text-slate-400" : "text-black/50")}>{t("form.detecting_operator")}</div>
                    ) : null}
                    {operator && phoneStep2Ok ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold",
                          L
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                        data-testid="operator-detected"
                      >
                        <CheckCircle weight="fill" className="h-5 w-5" />
                        {detectedLine(operator)}
                      </motion.div>
                    ) : nationalPhone.length > 0 && !detectingOperator ? (
                      <div className={cn("text-xs", L ? "text-slate-500" : "text-black/40")}>
                        {phoneStep2Ok && !operator && country.code !== "HT"
                          ? t("form.operator_not_found")
                          : `${t("form.detected")}…`}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      data-testid="back-step1"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className={L ? "border-white/20 bg-white/5 text-white hover:bg-white/10" : undefined}
                    >
                      <ArrowLeft className="h-4 w-4" /> {t("btn.back")}
                    </Button>
                    <Button
                      data-testid="next-step3"
                      variant="green"
                      className={cn("flex-1", L && "bg-[#00D084] hover:bg-emerald-400 shadow-[0_8px_30px_rgba(0,208,132,0.35)]")}
                      disabled={!operator || !phoneStep2Ok || detectingOperator}
                      onClick={() => setStep(3)}
                    >
                      {t("btn.continue")} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — amount */}
            {step === 3 && operator && (
              <motion.div key="s3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", L ? "text-slate-400" : "text-black/50")}>STEP 3</div>
                <h3 className={cn("mt-1 text-2xl font-bold tracking-tight", L ? "font-landing-display text-white" : "font-display")}>{t("form.step3")}</h3>

                <Tabs value={type} onValueChange={(v) => setType(v as any)} className="mt-4">
                  <TabsList className={L ? "bg-white/10 p-1" : undefined}>
                    <TabsTrigger
                      data-testid="tab-airtime"
                      value="airtime"
                      className={
                        L
                          ? "text-slate-400 data-[state=active]:bg-[#00D084]/25 data-[state=active]:text-white data-[state=active]:shadow-none"
                          : undefined
                      }
                    >
                      {L ? "💰 " : null}
                      <Wallet weight="duotone" className="h-4 w-4" /> {t("form.airtime")}
                    </TabsTrigger>
                    <TabsTrigger
                      data-testid="tab-data"
                      value="data_plan"
                      disabled={filteredPlans.length === 0}
                      className={
                        L
                          ? "text-slate-400 data-[state=active]:bg-[#00D084]/25 data-[state=active]:text-white data-[state=active]:shadow-none"
                          : undefined
                      }
                    >
                      {L ? "📱 " : null}
                      <Lightning weight="duotone" className="h-4 w-4" /> {t("form.data")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="airtime" className="mt-5">
                    <div className={cn("grid gap-2", L ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6" : "grid-cols-3 sm:grid-cols-3")}>
                      {QUICK_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          data-testid={`amount-${a}`}
                          onClick={() => {
                            setAmount(a);
                            setCustomAmount("");
                          }}
                          className={cn(
                            "flex h-16 flex-col items-center justify-center rounded-2xl border text-base font-bold transition-all",
                            amount === a
                              ? L
                                ? "border-[#00D084] bg-[#00D084]/20 text-white shadow-[0_0_24px_rgba(0,208,132,0.35)]"
                                : "border-brand-green bg-emerald-50 text-emerald-700 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.5)]"
                              : L
                                ? "border-white/10 bg-white/5 text-slate-100 hover:border-[#00D084]/50"
                                : "border-black/10 bg-white text-brand-ink hover:border-brand-green/50",
                          )}
                        >
                          ${a}
                          <span
                            className={cn(
                              "mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]",
                              L ? "text-slate-400" : "text-black/40",
                            )}
                          >
                            ~{formatHTG(a, operator.fxRate)} {operator.currency}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Input
                        data-testid="custom-amount"
                        type="number"
                        placeholder={t("form.custom") + " ($)"}
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setAmount(null);
                        }}
                        min={1}
                        className={
                          L
                            ? "border-white/15 bg-white/10 text-white placeholder:text-slate-500 focus:border-[#00D084] focus:ring-[#00D084]/25"
                            : undefined
                        }
                      />
                    </div>
                    {finalAmount > 0 && (
                      <div
                        className={cn(
                          "mt-3 flex items-center justify-between rounded-xl px-4 py-3 text-sm",
                          L ? "bg-white/5" : "bg-brand-bg",
                        )}
                      >
                        <span className={L ? "text-slate-400" : "text-black/60"}>{t("form.recipient_gets")}</span>
                        <span className={cn("text-base font-bold tracking-tight", L ? "font-landing-stat text-white" : "font-display")}>
                          ~{formatHTG(finalAmount, operator.fxRate)} {operator.currency}
                        </span>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="data_plan" className="mt-5">
                    <div className="space-y-2">
                      {filteredPlans.map((p) => (
                        <button
                          key={p.id}
                          data-testid={`plan-${p.id}`}
                          onClick={() => setPlan(p.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all",
                            plan === p.id
                              ? L
                                ? "border-[#00D084] bg-[#00D084]/15"
                                : "border-brand-green bg-emerald-50"
                              : L
                                ? "border-white/10 bg-white/5 hover:border-[#00D084]/40"
                                : "border-black/10 bg-white hover:border-brand-green/50",
                          )}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("font-bold tracking-tight", L ? "font-landing-display text-white" : "font-display")}>{p.name}</span>
                              {p.popular && (
                                <Badge variant="gold">
                                  <Sparkle className="h-3 w-3" /> {t("form.popular")}
                                </Badge>
                              )}
                            </div>
                            <div className={cn("mt-0.5 text-xs", L ? "text-slate-400" : "text-black/50")}>
                              {p.data} · {p.validity}
                            </div>
                          </div>
                          <div className={cn("text-lg font-extrabold tracking-tight", L ? "font-landing-stat text-[#00D084]" : "font-display")}>
                            ${p.priceUsd}
                          </div>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-5 flex gap-3">
                  <Button
                    data-testid="back-step2"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className={L ? "border-white/20 bg-white/5 text-white hover:bg-white/10" : undefined}
                  >
                    <ArrowLeft className="h-4 w-4" /> {t("btn.back")}
                  </Button>
                  <Button
                    data-testid="next-step4"
                    variant="green"
                    className={cn("flex-1", L && "bg-[#00D084] hover:bg-emerald-400 shadow-[0_8px_30px_rgba(0,208,132,0.35)]")}
                    disabled={finalAmount <= 0}
                    onClick={() => setStep(4)}
                  >
                    {t("btn.continue")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5 — receipt (ZHONGJI / WhatsApp / email) */}
            {step === 5 && successTx && (
              <ReceiptSuccessPanel
                tx={successTx}
                dial={country.dial}
                nationalDigits={phone.replace(/\D/g, "")}
                cashierName={cashierForReceipt}
                onSkip={finishReceiptAndLeave}
              />
            )}

            {/* STEP 4 — pay */}
            {step === 4 && operator && (
              <motion.div key="s4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", L ? "text-slate-400" : "text-black/50")}>STEP 4</div>
                <h3 className={cn("mt-1 text-2xl font-bold tracking-tight", L ? "font-landing-display text-white" : "font-display")}>{t("form.step4")}</h3>
                {commissionPct != null && commissionPct > 0 ? (
                  <div
                    className={cn(
                      "mt-2 rounded-xl border px-3 py-2 text-sm font-semibold",
                      L ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100" : "border-emerald-200 bg-emerald-50 text-emerald-800",
                    )}
                  >
                    Komisyon ajan: {commissionPct}% sou lavant sa a.
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  <div
                    className={cn(
                      "rounded-2xl border p-4",
                      L ? "border-white/10 bg-white/5" : "border-black/5 bg-brand-bg",
                    )}
                  >
                    <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", L ? "text-slate-400" : "text-black/50")}>
                      {t("form.summary_title")}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm">
                      <div className="flex justify-between">
                        <span className={L ? "text-slate-400" : "text-black/60"}>{t("form.summary_operator")}</span>
                        <span className="font-semibold">
                          {operator.flag} {operator.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={L ? "text-slate-400" : "text-black/60"}>{t("form.summary_phone")}</span>
                        <span className="font-mono font-semibold">
                          {country.dial} {phone}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={L ? "text-slate-400" : "text-black/60"}>{t("form.summary_type")}</span>
                        <span className="font-semibold uppercase tracking-wide">
                          {type === "airtime" ? t("form.airtime") : t("form.data") + (plan ? ` · ${DATA_PLANS.find((p) => p.id === plan)?.name}` : "")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={L ? "text-slate-400" : "text-black/60"}>{t("form.summary_delay")}</span>
                        <span className="font-semibold text-[#00D084]">{t("form.summary_instant")}</span>
                      </div>
                      <div className={cn("mt-2 flex items-end justify-between border-t pt-2", L ? "border-white/10" : "border-black/5")}>
                        <span className={L ? "text-slate-400" : "text-black/60"}>{t("form.summary_total")}</span>
                        <span className={cn("text-2xl font-extrabold tracking-tight", L ? "font-landing-stat text-white" : "font-display")}>
                          {formatCurrency(finalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={cn("grid gap-2", isStoreUi ? "grid-cols-2" : "grid-cols-1")}>
                    <button
                      type="button"
                      data-testid="pay-stripe"
                      onClick={() => setPaymentMethod("stripe")}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all",
                        paymentMethod === "stripe"
                          ? L
                            ? "border-[#00D084] bg-[#00D084]/15"
                            : "border-brand-green bg-emerald-50"
                          : L
                            ? "border-white/10 bg-white/5 hover:border-[#00D084]/40"
                            : "border-black/10 hover:border-brand-green/50",
                      )}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {L ? <span aria-hidden>💳</span> : null}
                        <CreditCard className="h-4 w-4" /> {t("form.pay_card")}
                      </div>
                      <div className={cn("text-[10px] uppercase tracking-[0.18em]", L ? "text-slate-500" : "text-black/40")}>Stripe · Visa · Mastercard</div>
                    </button>
                    {isStoreUi ? (
                      <button
                        type="button"
                        data-testid="pay-cash"
                        onClick={() => {
                          setPaymentMethod("cash");
                          void tryOpenCashDrawer();
                        }}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all",
                          paymentMethod === "cash"
                            ? L
                              ? "border-[#00D084] bg-[#00D084]/15"
                              : "border-brand-green bg-emerald-50"
                            : L
                              ? "border-white/10 bg-white/5 hover:border-[#00D084]/40"
                              : "border-black/10 hover:border-brand-green/50",
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Wallet className="h-4 w-4" /> {t("form.pay_cash")}
                        </div>
                        <div className={cn("text-[10px] uppercase tracking-[0.18em]", L ? "text-slate-500" : "text-black/40")}>
                          CASH · TIROIR ZHONGJI
                        </div>
                      </button>
                    ) : null}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      data-testid="back-step3"
                      variant="outline"
                      onClick={() => setStep(3)}
                      className={L ? "border-white/20 bg-white/5 text-white hover:bg-white/10" : undefined}
                    >
                      <ArrowLeft className="h-4 w-4" /> {t("btn.back")}
                    </Button>
                    <Button
                      data-testid="submit-recharge"
                      variant="green"
                      size="lg"
                      className={cn("flex-1", L && "bg-[#00D084] hover:bg-emerald-400 shadow-[0_8px_30px_rgba(0,208,132,0.35)]")}
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      {submitting ? (
                        <span className="animate-pulse">{t("status.pending")}</span>
                      ) : paymentMethod === "stripe" ? (
                        <>{t("form.cta_pay_card")}</>
                      ) : (
                        <>{t("btn.send")}</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p
        className={cn(
          "mt-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em]",
          L ? "text-slate-500" : "text-white/50 mix-blend-difference",
        )}
      >
        <Phone className="h-3 w-3" /> 100% SECURE · INSTANT · 150+ COUNTRIES
      </p>
    </div>
  );
}

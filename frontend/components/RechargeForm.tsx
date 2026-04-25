"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { addTx, TxLocal } from "@/lib/store";
import { uid, formatCurrency, formatHTG } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const COUNTRIES = [
  { code: "HT", flag: "🇭🇹", dial: "+509", name: "Haiti" },
  { code: "US", flag: "🇺🇸", dial: "+1", name: "United States" },
  { code: "CA", flag: "🇨🇦", dial: "+1", name: "Canada" },
  { code: "DO", flag: "🇩🇴", dial: "+1", name: "Dominican Republic" },
];

export function RechargeForm({ compact = false }: { compact?: boolean }) {
  const { t } = useLang();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<Operator | null>(null);
  const [type, setType] = useState<"airtime" | "data_plan">("airtime");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "moncash">("stripe");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Auto-detect operator
  useEffect(() => {
    if (phone.length >= 4) {
      const op = detectOperator(phone, country.code);
      setOperator(op);
    } else {
      setOperator(null);
    }
  }, [phone, country]);

  const finalAmount = useMemo(() => {
    if (type === "data_plan" && plan) {
      const p = DATA_PLANS.find((x) => x.id === plan);
      return p?.priceUsd || 0;
    }
    if (amount) return amount;
    const c = parseFloat(customAmount);
    return isNaN(c) ? 0 : c;
  }, [type, amount, customAmount, plan]);

  const filteredPlans = operator ? DATA_PLANS.filter((p) => p.operatorId === operator.id) : [];

  function selectOperatorCard(opId: number) {
    const op = OPERATORS.find((o) => o.id === opId);
    if (op) {
      setOperator(op);
      setCountry(COUNTRIES.find((c) => c.code === op.countryCode) || COUNTRIES[0]);
      setStep(2);
    }
  }

  async function handleSubmit() {
    if (!operator || !phone || !finalAmount) {
      toast.error("Please complete all steps");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/recharge/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: operator.id,
          recipientPhone: { countryCode: country.code, number: phone.replace(/\D/g, "") },
          amount: finalAmount,
          type,
          planId: plan,
          paymentMethod,
          userEmail: user?.email || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");

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
      // Reset & redirect
      setStep(1);
      setPhone("");
      setAmount(null);
      setCustomAmount("");
      setPlan(null);
      router.push("/tableau-de-bord");
    } catch (e: any) {
      toast.error(e.message || t("status.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const stepDots = [1, 2, 3, 4];

  return (
    <div data-testid="recharge-form" className={`relative text-brand-ink ${compact ? "" : "mx-auto w-full max-w-xl"}`}>
      <div className="rounded-3xl border border-black/5 bg-white p-2 text-brand-ink shadow-[0_30px_80px_-20px_rgba(17,24,39,0.4)]">
        {/* Step indicator */}
        <div className="flex items-center justify-between rounded-2xl bg-brand-bg px-4 py-3">
          <div className="flex items-center gap-2">
            {stepDots.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    step >= s
                      ? "bg-brand-ink text-white"
                      : "bg-white text-black/40 ring-1 ring-black/10"
                  }`}
                >
                  {s}
                </div>
                {s < 4 && <div className={`h-px w-6 ${step > s ? "bg-brand-ink" : "bg-black/10"}`} />}
              </div>
            ))}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
            STEP {step}/4
          </div>
        </div>

        <div className="p-5 sm:p-7">
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
                  STEP 1
                </div>
                <h3 className="font-display mt-1 text-2xl font-bold tracking-tight">
                  {t("form.step1")}
                </h3>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {OPERATORS.filter((o) => o.countryCode === "HT").map((op) => (
                    <button
                      key={op.id}
                      data-testid={`op-card-${op.id}`}
                      onClick={() => selectOperatorCard(op.id)}
                      className="group relative flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 text-left transition-all hover:border-emerald-400 hover:shadow-[0_8px_24px_-12px_rgba(16,185,129,0.4)]"
                    >
                      <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-bg text-2xl">
                        {op.flag}
                      </div>
                      <div className="flex-1">
                        <div className="font-display font-bold tracking-tight">{op.name}</div>
                        <div className="text-xs text-black/50">{op.countryName}</div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-black/30 transition-all group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </button>
                  ))}
                  <button
                    data-testid="op-card-other"
                    onClick={() => setStep(2)}
                    className="group flex items-center gap-4 rounded-2xl border border-dashed border-black/15 bg-white p-4 text-left transition-all hover:border-brand-ink"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-bg">
                      <Globe className="h-6 w-6 text-brand-ink" />
                    </div>
                    <div className="flex-1">
                      <div className="font-display font-bold tracking-tight">Lòt Peyi</div>
                      <div className="text-xs text-black/50">USA, CA, DO & 150+ peyi</div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-black/30 group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — phone */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">STEP 2</div>
                <h3 className="font-display mt-1 text-2xl font-bold tracking-tight">{t("form.step2")}</h3>

                <div className="mt-5 grid gap-3">
                  <div className="flex gap-2">
                    <select
                      data-testid="country-select"
                      value={country.code}
                      onChange={(e) => {
                        const c = COUNTRIES.find((x) => x.code === e.target.value);
                        if (c) setCountry(c);
                      }}
                      className="h-12 rounded-xl border border-black/10 bg-white px-3 text-base font-semibold text-brand-ink focus:border-brand-green focus:outline-none focus:ring-4 focus:ring-emerald-100"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.dial}
                        </option>
                      ))}
                    </select>
                    <Input
                      data-testid="phone-input"
                      type="tel"
                      inputMode="tel"
                      placeholder={t("form.phone_placeholder")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="min-h-[44px]">
                    {operator && phone.length >= 4 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
                        data-testid="operator-detected"
                      >
                        <CheckCircle weight="fill" className="h-5 w-5" />
                        {t("form.detected")}: {operator.name}
                      </motion.div>
                    ) : phone.length > 0 ? (
                      <div className="text-xs text-black/40">{t("form.detected")}…</div>
                    ) : null}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button data-testid="back-step1" variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="h-4 w-4" /> {t("btn.back")}
                    </Button>
                    <Button
                      data-testid="next-step3"
                      variant="green"
                      className="flex-1"
                      disabled={!operator || phone.length < 4}
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
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">STEP 3</div>
                <h3 className="font-display mt-1 text-2xl font-bold tracking-tight">{t("form.step3")}</h3>

                <Tabs value={type} onValueChange={(v) => setType(v as any)} className="mt-4">
                  <TabsList>
                    <TabsTrigger data-testid="tab-airtime" value="airtime">
                      <Wallet weight="duotone" className="h-4 w-4" /> {t("form.airtime")}
                    </TabsTrigger>
                    <TabsTrigger data-testid="tab-data" value="data_plan" disabled={filteredPlans.length === 0}>
                      <Lightning weight="duotone" className="h-4 w-4" /> {t("form.data")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="airtime" className="mt-5">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                      {QUICK_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          data-testid={`amount-${a}`}
                          onClick={() => {
                            setAmount(a);
                            setCustomAmount("");
                          }}
                          className={`flex h-16 flex-col items-center justify-center rounded-2xl border text-base font-bold transition-all ${
                            amount === a
                              ? "border-brand-green bg-emerald-50 text-emerald-700 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.5)]"
                              : "border-black/10 bg-white text-brand-ink hover:border-brand-green/50"
                          }`}
                        >
                          ${a}
                          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-black/40">
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
                      />
                    </div>
                    {finalAmount > 0 && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-bg px-4 py-3 text-sm">
                        <span className="text-black/60">{t("form.recipient_gets")}</span>
                        <span className="font-display text-base font-bold tracking-tight">
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
                          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                            plan === p.id
                              ? "border-brand-green bg-emerald-50"
                              : "border-black/10 bg-white hover:border-brand-green/50"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-bold tracking-tight">{p.name}</span>
                              {p.popular && <Badge variant="gold"><Sparkle className="h-3 w-3" /> {t("form.popular")}</Badge>}
                            </div>
                            <div className="mt-0.5 text-xs text-black/50">
                              {p.data} · {p.validity}
                            </div>
                          </div>
                          <div className="font-display text-lg font-extrabold tracking-tight">${p.priceUsd}</div>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-5 flex gap-3">
                  <Button data-testid="back-step2" variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-4 w-4" /> {t("btn.back")}
                  </Button>
                  <Button
                    data-testid="next-step4"
                    variant="green"
                    className="flex-1"
                    disabled={finalAmount <= 0}
                    onClick={() => setStep(4)}
                  >
                    {t("btn.continue")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4 — pay */}
            {step === 4 && operator && (
              <motion.div key="s4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">STEP 4</div>
                <h3 className="font-display mt-1 text-2xl font-bold tracking-tight">{t("form.step4")}</h3>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-black/5 bg-brand-bg p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">Summary</div>
                    <div className="mt-2 grid gap-1 text-sm">
                      <div className="flex justify-between"><span className="text-black/60">Operator</span><span className="font-semibold">{operator.flag} {operator.name}</span></div>
                      <div className="flex justify-between"><span className="text-black/60">Recipient</span><span className="font-mono font-semibold">{country.dial} {phone}</span></div>
                      <div className="flex justify-between"><span className="text-black/60">Type</span><span className="font-semibold uppercase tracking-wide">{type === "airtime" ? t("form.airtime") : t("form.data") + (plan ? ` · ${DATA_PLANS.find((p)=>p.id===plan)?.name}` : "")}</span></div>
                      <div className="mt-2 flex items-end justify-between border-t border-black/5 pt-2">
                        <span className="text-black/60">Total</span>
                        <span className="font-display text-2xl font-extrabold tracking-tight">{formatCurrency(finalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      data-testid="pay-stripe"
                      onClick={() => setPaymentMethod("stripe")}
                      className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${paymentMethod === "stripe" ? "border-brand-green bg-emerald-50" : "border-black/10 hover:border-brand-green/50"}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4" /> {t("form.pay_card")}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Stripe · Visa · Mastercard</div>
                    </button>
                    <button
                      data-testid="pay-moncash"
                      onClick={() => setPaymentMethod("moncash")}
                      className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${paymentMethod === "moncash" ? "border-brand-green bg-emerald-50" : "border-black/10 hover:border-brand-green/50"}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4" /> {t("form.pay_moncash")}</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/40">Mobile money</div>
                    </button>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button data-testid="back-step3" variant="outline" onClick={() => setStep(3)}>
                      <ArrowLeft className="h-4 w-4" /> {t("btn.back")}
                    </Button>
                    <Button
                      data-testid="submit-recharge"
                      variant="green"
                      size="lg"
                      className="flex-1"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      {submitting ? <span className="animate-pulse">{t("status.pending")}</span> : <>{t("btn.send")}</>}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/50 mix-blend-difference">
        <Phone className="h-3 w-3" /> 100% SECURE · INSTANT · 150+ COUNTRIES
      </p>
    </div>
  );
}

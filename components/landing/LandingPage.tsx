"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { CheckCircle, Lightning, Star } from "@phosphor-icons/react";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import { LandingFooter } from "./LandingFooter";
import { LandingNavbar } from "./LandingNavbar";

const RechargeForm = dynamic(
  () => import("@/components/RechargeForm").then((m) => ({ default: m.RechargeForm })),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[520px] w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl animate-pulse"
        aria-busy
      />
    ),
  },
);

const OPERATOR_LOGOS = [
  { name: "Digicel", src: "/operators/digicel.svg" },
  { name: "Natcom", src: "/operators/natcom.svg" },
  { name: "Orange", src: "/operators/orange.svg" },
  { name: "Vodafone", src: "/operators/vodafone.svg" },
  { name: "MTN", src: "/operators/mtn.svg" },
  { name: "Claro", src: "/operators/claro.svg" },
  { name: "Movistar", src: "/operators/movistar.svg" },
];

/** Bandeau section Couverture — marques demandées (affichage landing uniquement). */
const COVERAGE_STRIP_LOGOS = [
  { name: "Digicel", src: "/operators/digicel.svg" },
  { name: "Natcom", src: "/operators/natcom.svg" },
  { name: "AT&T", src: "/operators/att.svg" },
  { name: "T-Mobile", src: "/operators/tmobile.svg" },
  { name: "Verizon", src: "/operators/verizon.svg" },
  { name: "Rogers", src: "/operators/rogers.svg" },
  { name: "Bell", src: "/operators/bell.svg" },
  { name: "Orange", src: "/operators/orange.svg" },
  { name: "SFR", src: "/operators/sfr.svg" },
  { name: "Claro", src: "/operators/claro.svg" },
  { name: "Tigo", src: "/operators/tigo.svg" },
];

/** Avis : photos de client·e·s noirs·es ; textes en kreyòl ; carte 3 = espagnol + même idée en kreyòl. */
const LANDING_TESTIMONIALS = [
  {
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=160&fit=crop&crop=faces&q=75",
    quoteKr:
      "Depi Miami mwen voye Digicel pou manman m chak semèn — Monican fè l vit, epi li resevwa l an kèk segond. Mèsi anpil!",
  },
  {
    img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&h=160&fit=crop&crop=faces&q=75",
    quoteKr:
      "Sèvis la klè, peman an san pwoblèm, livrezon an instantane. Se pi bon fason pou m rete konekte ak fanmi mwen an Ayiti. Mwen rekòmande l!",
  },
  {
    img: "https://images.unsplash.com/photo-1589156280159-27698b77008e?w=160&h=160&fit=crop&crop=faces&q=75",
    quoteEs:
      "Con Monican envío recarga a mi familia en Haití desde Santo Domingo — rápido, fácil y sin complicaciones.",
    quoteKr:
      "Ak Monican mwen voye recharge pou fanmi mwen an Ayiti depi Santo Domingo — rapid, fasil, san tet anba.",
  },
] as const;

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop",
];

const STORY_IMG = "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=720&h=900&fit=crop&q=75";
const FAMILY_STRIP = [
  {
    src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=480&h=320&fit=crop&q=75",
    caption: "Fanmi nan Miami · Recharge Digicel voye ✅",
  },
  {
    src: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=480&h=320&fit=crop&q=75",
    caption: "Diaspora Kanada · Natcom konekte 📱",
  },
  {
    src: "https://images.unsplash.com/photo-1511485977113-f34c92461ad9?w=480&h=320&fit=crop&q=75",
    caption: "Depi Paris · Voye an 8 segond ⚡",
  },
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=480&h=320&fit=crop&q=75",
    caption: "Kliyan Monican · 3,000+ satisfè ⭐",
  },
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=480&h=320&fit=crop&q=75",
    caption: "Recharge instantane · 150+ peyi 🌍",
  },
] as const;

function useAnimatedNumber(target: number, enabled: boolean, durationMs = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs);
      const ease = 1 - Math.pow(1 - p, 3);
      setN(target * ease);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, target, durationMs]);
  return n;
}

function StatCell({
  icon,
  raw,
  decimals,
  suffix,
  label,
  enabled,
}: {
  icon: React.ReactNode;
  raw: number;
  decimals: number;
  suffix: string;
  label: string;
  enabled: boolean;
}) {
  const n = useAnimatedNumber(raw, enabled);
  const text = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center sm:px-8">
      <div className="text-2xl">{icon}</div>
      <div className="font-landing-stat text-4xl font-bold tracking-tight text-white sm:text-5xl">
        {text}
        {suffix}
      </div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

export function LandingPage() {
  const { t } = useLang();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-10% 0px" });
  const [calcN, setCalcN] = useState(120);
  const [calcAvg, setCalcAvg] = useState(15);
  const estCommission = useMemo(() => Math.round(calcN * calcAvg * 0.025), [calcN, calcAvg]);

  function scrollToForm() {
    document.getElementById("recharge-main")?.scrollIntoView({ behavior: "smooth" });
  }

  function openPwa() {
    window.dispatchEvent(new CustomEvent("monican-open-pwa-banner"));
  }

  return (
    <main className="min-h-screen bg-[#0A0E1A] font-landing text-slate-200 antialiased">
      <LandingNavbar />

      {/* ——— HERO ——— */}
      <section className="relative min-h-[100svh] overflow-hidden pt-20">
        <div className="landing-hero-gradient absolute inset-0" />
        <div className="landing-hero-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-[#7C3AED]/30 blur-[120px]"
            animate={{ scale: [1, 1.08, 1], x: [0, 20, 0], y: [0, -16, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-[#00D084]/25 blur-[100px]"
            animate={{ scale: [1, 1.06, 1], x: [0, -24, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 left-1/2 h-[480px] w-[480px] -translate-x-1/2 translate-y-1/3 rounded-full bg-[#1D4ED8]/20 blur-[150px]"
            animate={{ opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-12">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur-md"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00D084] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00D084]" />
              </span>
              {t("landing.hero_badge")}
            </motion.div>

            <motion.h1
              className="font-landing-display mt-8 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              <motion.span variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="block">
                {t("landing.hero_l1")}
              </motion.span>
              <motion.span variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="block text-slate-300">
                {t("landing.hero_l2")}
              </motion.span>
              <motion.span variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} className="block landing-gradient-accent">
                {t("landing.hero_l3")}
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              className="mt-6 max-w-xl text-lg text-slate-300"
            >
              {t("landing.hero_sub")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.45 }}
              className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-xl sm:flex-row sm:flex-wrap sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white">
                <span>🇭🇹</span>
                <span className="truncate">Digicel Haiti</span>
                <span className="ml-auto text-slate-500">▾</span>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <span className="text-slate-400">+509</span>
                <span className="text-slate-600">__________</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold">
                $10 <span className="text-slate-500">▾</span>
              </div>
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00D084] to-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_30px_rgba(0,208,132,0.35)] transition hover:brightness-110"
              >
                <Lightning weight="fill" className="h-4 w-4" />
                {t("landing.hero_cta")}
              </button>
            </motion.div>
            <p className="mt-3 text-sm text-slate-400">{t("landing.hero_no_signup")}</p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
            >
              <div className="flex -space-x-3">
                {AVATARS.map((src, i) => (
                  <div
                    key={src}
                    className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-[#0A0E1A] ring-2 ring-[#00D084]/30"
                    style={{ zIndex: AVATARS.length - i }}
                  >
                    <Image
                      src={src}
                      alt=""
                      width={44}
                      height={44}
                      className="object-cover"
                      sizes="44px"
                      priority={i === 0}
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </div>
                ))}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{t("landing.social")}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-amber-400">
                  <Star weight="fill" className="h-4 w-4" />
                  <Star weight="fill" className="h-4 w-4" />
                  <Star weight="fill" className="h-4 w-4" />
                  <Star weight="fill" className="h-4 w-4" />
                  <Star weight="fill" className="h-4 w-4" />
                  <span className="ml-1 text-slate-300">{t("landing.rating")}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto flex w-full max-w-md justify-center lg:max-w-none">
            {[
              { fl: "🇭🇹", top: "6%", left: "4%" },
              { fl: "🇺🇸", top: "18%", right: "8%" },
              { fl: "🇨🇦", top: "42%", left: "2%" },
              { fl: "🇫🇷", top: "58%", right: "4%" },
              { fl: "🇩🇴", top: "72%", left: "12%" },
              { fl: "🇧🇷", top: "28%", left: "28%" },
              { fl: "🇬🇧", top: "8%", left: "44%" },
            ].map((x, i) => (
              <motion.span
                key={x.fl}
                className="pointer-events-none absolute text-2xl opacity-70"
                style={{ top: x.top, left: x.left, right: x.right }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4 + i * 0.4, repeat: Infinity, delay: i * 0.2 }}
              >
                {x.fl}
              </motion.span>
            ))}

            <motion.div
              className="relative z-10 w-[min(100%,280px)]"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-slate-800 to-slate-950 p-3 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7),0_0_60px_rgba(0,208,132,0.15)]"
              >
                <div className="absolute inset-x-8 -bottom-4 h-8 rounded-full bg-[#00D084]/25 blur-2xl" />
                <div className="relative overflow-hidden rounded-[2rem] bg-[#0b0f1a]">
                  <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">
                    <span>9:41</span>
                    <span className="rounded-full bg-white/5 px-3 py-0.5 text-[10px]">Monican</span>
                    <span>LTE</span>
                  </div>
                  <div className="space-y-4 px-5 pb-8 pt-2">
                    <div className="flex items-center gap-2 text-[#00D084]">
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="inline-flex"
                      >
                        <CheckCircle weight="fill" className="h-7 w-7" />
                      </motion.span>
                      <span className="text-sm font-bold text-white">{t("landing.phone_ui_sent")}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                      <div className="text-slate-400">{t("landing.phone_ui_line")}</div>
                      <div className="mt-2 font-landing-stat text-xl font-bold text-white">{t("landing.phone_ui_htg")}</div>
                      <div className="mt-2 text-xs font-semibold text-[#00D084]">{t("landing.phone_ui_fast")}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.45 }}
              className="absolute left-0 top-[8%] z-20 hidden max-w-[200px] rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-white shadow-xl backdrop-blur-xl sm:block lg:left-[-8%]"
            >
              <div className="font-semibold">🇭🇹 Digicel Haiti</div>
              <div className="mt-1 text-white/80">{t("landing.float1")}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55, duration: 0.45 }}
              className="absolute bottom-[18%] right-0 z-20 hidden max-w-[200px] rounded-2xl border border-[#00D084]/40 bg-[#00D084]/15 p-4 text-xs text-emerald-50 shadow-xl backdrop-blur-xl sm:block lg:right-[-6%]"
            >
              <div className="font-bold text-[#00D084]">⚡ {t("landing.instant_short")}</div>
              <div className="mt-1">{t("landing.float2")}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full bg-[#00D084]" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ delay: 0.8, duration: 0.8 }} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.65, type: "spring", stiffness: 260, damping: 18 }}
              className="absolute right-[5%] top-[6%] z-20 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md"
            >
              {t("landing.float3")}
            </motion.div>
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
            <motion.div
              className="flex gap-3"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 24, ease: "linear", repeat: Infinity }}
            >
              {[...FAMILY_STRIP, ...FAMILY_STRIP].map((item, idx) => (
                <div
                  key={`${item.src}-${idx}`}
                  className="relative h-32 min-w-[220px] overflow-hidden rounded-2xl sm:h-40 sm:min-w-[260px]"
                >
                  <Image
                    src={item.src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width:640px) 220px, 260px"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-[11px] font-semibold leading-snug text-white sm:text-xs">
                    {item.caption}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ——— STATS ——— */}
      <section ref={statsRef} className="border-y border-white/5 bg-[#111827]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-white/10 md:grid-cols-4 md:divide-x">
          <StatCell icon="⚡" raw={8} decimals={0} suffix="s" label={t("landing.stats1")} enabled={statsInView} />
          <StatCell icon="🌍" raw={150} decimals={0} suffix="+" label={t("landing.stats2")} enabled={statsInView} />
          <StatCell icon="✅" raw={99.9} decimals={1} suffix="%" label={t("landing.stats3")} enabled={statsInView} />
          <StatCell icon="👥" raw={3000} decimals={0} suffix="+" label={t("landing.stats4")} enabled={statsInView} />
        </div>
      </section>

      {/* ——— MAIN FORM ——— */}
      <section id="recharge-main" className="scroll-mt-24 bg-gradient-to-b from-[#0F172A] to-[#0A0E1A] py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="mb-10 text-center"
          >
            <h2 className="font-landing-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t("landing.form_section_title")}</h2>
            <p className="mt-3 text-lg text-slate-400">{t("landing.form_section_sub")}</p>
          </motion.div>
          <RechargeForm visualMode="landing" showReceiptPanel={false} />
        </div>
      </section>

      {/* ——— HOW ——— */}
      <section id="how-it-works" className="scroll-mt-24 border-t border-white/5 bg-[#0A0E1A] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-landing-display text-center text-3xl font-extrabold text-white sm:text-4xl">{t("landing.how_title")}</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", icon: "📱", glow: "shadow-[0_0_40px_rgba(0,208,132,0.25)]", title: t("how.s1.title"), body: t("how.s1.desc") },
              { n: "2", icon: "💰", glow: "shadow-[0_0_40px_rgba(245,158,11,0.2)]", title: t("how.s2.title"), body: t("how.s2.desc") },
              { n: "3", icon: "⚡", glow: "shadow-[0_0_40px_rgba(0,208,132,0.3)]", title: t("how.s3.title"), body: t("how.s3.desc") },
            ].map((c, i) => (
              <motion.div
                key={c.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl transition hover:-translate-y-1",
                  c.glow,
                )}
              >
                <div className="pointer-events-none absolute -right-2 -top-2 font-landing-display text-8xl font-black text-white/[0.04]">{c.n}</div>
                <div className="text-4xl">{c.icon}</div>
                <h3 className="font-landing-display mt-6 text-xl font-bold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.body}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-12 text-center text-sm text-slate-500">{t("landing.how_timeline")}</p>
        </div>
      </section>

      {/* ——— MAP / COVERAGE ——— */}
      <section id="coverage" className="scroll-mt-24 bg-[#111827] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-landing-display text-3xl font-extrabold text-white sm:text-4xl">{t("landing.map_title")}</h2>
            <p className="mt-3 text-slate-400">{t("landing.map_sub")}</p>
            <p className="mt-6 text-2xl tracking-wide text-slate-300" aria-label="Featured countries">
              🇭🇹 🇺🇸 🇨🇦 🇫🇷 🇩🇴 🇧🇷
            </p>
          </div>
          <div className="relative mt-10 flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-[#0A0E1A]/80 bg-[radial-gradient(ellipse_at_center,rgba(0,208,132,0.12),transparent_70%)] sm:h-80">
            <svg viewBox="0 0 800 320" className="h-full w-full max-w-4xl opacity-40" aria-hidden>
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                className="text-slate-600"
                d="M80,200 Q200,120 400,160 T720,140"
              />
              <circle cx="400" cy="160" r="6" className="fill-[#00D084]" />
              <circle cx="180" cy="140" r="4" className="fill-violet-400" />
              <circle cx="620" cy="130" r="4" className="fill-violet-400" />
            </svg>
            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-400 sm:gap-6">
              <span>🇭🇹 Haiti</span>
              <span>🇺🇸 USA</span>
              <span>🇨🇦 Canada</span>
              <span>🇫🇷 France</span>
              <span>🇩🇴 RD</span>
              <span>🇧🇷 Brazil</span>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3">
            {COVERAGE_STRIP_LOGOS.map((op) => (
              <div
                key={`${op.name}-${op.src}`}
                className="flex h-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-3 shadow-md shadow-black/20 ring-1 ring-white/5 transition hover:border-emerald-400/30 sm:h-14 sm:px-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={op.src} alt="" className="h-6 w-auto max-w-[88px] object-contain opacity-95 sm:h-7 sm:max-w-[100px]" loading="lazy" />
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm sm:grid-cols-2">
            {[
              "🇭🇹 Haïti — Digicel, Natcom",
              "🇫🇷 France — Orange, SFR, Bouygues, Free",
              "🇬🇧 Royaume-Uni — Vodafone, EE, O2, Three",
              "🇳🇬 Nigeria — MTN, Airtel, Glo, 9mobile",
              "🇲🇽 Mexique — Telcel, Movistar, Virgin, +10",
              "🇪🇸 Espagne — Movistar, Orange, Vodafone",
            ].map((row) => (
              <div key={row} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-300">
                {row}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ——— TESTIMONIALS ——— */}
      <section className="border-t border-white/5 bg-[#0F172A] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-landing-display text-3xl font-extrabold text-white">{t("landing.testi_title")}</h2>
            <p className="mt-2 text-slate-400">{t("landing.testi_sub")}</p>
            <p className="mt-4 text-amber-400">{t("landing.testi_rating_line")}</p>
            <div className="mx-auto mt-6 max-w-md space-y-2 text-left text-xs text-slate-400">
              {[
                { pct: 87, w: "w-[87%]" },
                { pct: 9, w: "w-[9%]" },
                { pct: 3, w: "w-[3%]" },
                { pct: 1, w: "w-[1%]" },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6">{5 - i}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className={cn("h-full rounded-full bg-amber-500/80", r.w)} />
                  </div>
                  <span>{r.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {(
              [
                { n: "landing.testi_n1", l: "landing.testi_l1", d: "landing.testi_d1" },
                { n: "landing.testi_n2", l: "landing.testi_l2", d: "landing.testi_d2" },
                { n: "landing.testi_n3", l: "landing.testi_l3", d: "landing.testi_d3" },
              ] as const
            ).map((meta, i) => {
              const card = LANDING_TESTIMONIALS[i]!;
              return (
              <motion.div
                key={meta.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-lg shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/15 hover:shadow-xl"
              >
                <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-[#00D084]/25">
                  <Image src={card.img} alt="" width={56} height={56} className="object-cover" loading="lazy" />
                </div>
                <div className="mt-3 flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} weight="fill" className="h-4 w-4" />
                  ))}
                </div>
                {"quoteEs" in card && card.quoteEs ? (
                  <>
                    <p className="mt-4 text-sm leading-relaxed text-slate-200" lang="es">
                      &ldquo;{card.quoteEs}&rdquo;
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300/95" lang="ht">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#00D084]/90">Kreyòl · </span>
                      &ldquo;{card.quoteKr}&rdquo;
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-slate-200" lang="ht">
                    &ldquo;{card.quoteKr}&rdquo;
                  </p>
                )}
                <div className="mt-4 text-sm font-bold text-white">{t(meta.n)}</div>
                <div className="text-xs text-slate-500">{t(meta.l)}</div>
                <div className="mt-1 text-xs text-slate-600">{t(meta.d)}</div>
              </motion.div>
            );
            })}
          </div>
        </div>
      </section>

      {/* ——— AGENT ——— */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] py-20 sm:py-28">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white, transparent 45%)" }} />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-white/80">{t("landing.agent_tag")}</span>
            <h2 className="font-landing-display mt-4 text-3xl font-extrabold text-white sm:text-4xl">{t("landing.agent_h2")}</h2>
            <p className="mt-4 text-lg text-white/85">{t("landing.agent_body_long")}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
                  {t(`landing.agent_b${i}` as "landing.agent_b1")}
                </div>
              ))}
            </div>
            <Link
              href="/ajan"
              className="mt-8 inline-flex rounded-full bg-white px-8 py-4 text-sm font-bold text-[#4C1D95] shadow-lg transition hover:scale-[1.02]"
            >
              {t("landing.agent_btn")}
            </Link>
            <p className="mt-4 text-xs text-white/70">{t("landing.agent_small")}</p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-black/20 p-8 backdrop-blur-xl">
            <h3 className="font-landing-display text-xl font-bold text-white">{t("landing.calc_title")}</h3>
            <label className="mt-6 block text-sm text-white/80">{t("landing.calc_monthly")}</label>
            <input
              type="range"
              min={50}
              max={500}
              value={calcN}
              onChange={(e) => setCalcN(Number(e.target.value))}
              className="mt-2 w-full accent-white"
            />
            <div className="text-right font-landing-stat text-2xl font-bold text-white">{calcN}</div>
            <label className="mt-6 block text-sm text-white/80">{t("landing.calc_avg")}</label>
            <input
              type="range"
              min={10}
              max={30}
              step={1}
              value={calcAvg}
              onChange={(e) => setCalcAvg(Number(e.target.value))}
              className="mt-2 w-full accent-white"
            />
            <div className="text-right font-landing-stat text-2xl font-bold text-white">${calcAvg}</div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/10 p-6 text-center">
              <div className="text-sm text-white/70">{t("landing.calc_result")}</div>
              <div className="font-landing-stat mt-2 text-4xl font-extrabold text-[#F59E0B]">${estCommission}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— FINAL CTA ——— */}
      <section className="relative overflow-hidden py-24">
        <div className="landing-hero-gradient absolute inset-0 opacity-90" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D084]/12 blur-[100px]" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/20 blur-[120px]" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-landing-display text-4xl font-extrabold text-white sm:text-5xl">
            {t("landing.final_h2")}
            {t("landing.final_grad").trim() ? (
              <>
                {" "}
                <span className="landing-gradient-accent">{t("landing.final_grad")}</span>
              </>
            ) : null}
          </h2>
          <p className="mt-6 text-lg text-slate-400">{t("landing.final_sub")}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/enskri"
              className="landing-cta-gradient inline-flex items-center justify-center rounded-full px-10 py-4 text-base font-bold text-white shadow-[0_12px_40px_rgba(0,208,132,0.35)] transition hover:brightness-110"
            >
              {t("landing.final_cta1")}
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex rounded-full border border-white/20 px-8 py-4 text-sm font-semibold text-white hover:bg-white/5"
            >
              {t("landing.final_cta2")}
            </Link>
          </div>
          <p className="mt-10 text-xs text-slate-500">{t("landing.trust_row")}</p>
        </div>
      </section>

      {/* ——— PWA ——— */}
      <section className="bg-[#111827] py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-landing-display text-3xl font-extrabold text-white">{t("landing.pwa_title")}</h2>
            <p className="mt-3 text-slate-400">{t("landing.pwa_sub")}</p>
            <ul className="mt-8 space-y-4 text-slate-300">
              {(["landing.pwa_f1", "landing.pwa_f2", "landing.pwa_f3", "landing.pwa_f4"] as const).map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonPwa label={t("landing.pwa_install_ios")} onClick={openPwa} />
              <ButtonPwa label={t("landing.pwa_install_and")} onClick={openPwa} />
            </div>
            <p className="mt-4 text-xs text-slate-500">{t("landing.pwa_note")}</p>
          </div>
          <div className="relative mx-auto flex max-w-sm justify-center">
            <div className="relative w-[240px] rounded-[2rem] border border-white/10 bg-slate-900 p-3 shadow-2xl">
              <div className="rounded-[1.5rem] bg-[#0A0E1A] p-6 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#00D084]/20 text-[#00D084]">
                  <Lightning weight="fill" className="h-8 w-8" />
                </div>
                <div className="mt-4 text-sm font-bold text-white">Monican Recharge</div>
                <p className="mt-2 text-xs text-slate-500">{t("landing.pwa_hint")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— STORY ——— */}
      <section className="border-t border-white/5 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 1.03 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-[4/5] max-h-[520px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A0A2E] to-[#0D1B2A]"
          >
            <Image
              src={STORY_IMG}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E1A] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white backdrop-blur-md">
              {t("landing.story_badge")}
            </div>
          </motion.div>
          <div>
            <span className="text-sm font-bold uppercase tracking-wider text-[#7C3AED]">{t("landing.story_tag")}</span>
            <h2 className="font-landing-display mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{t("landing.story_h2")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">{t("landing.story_p")}</p>
            <ul className="mt-8 space-y-3 text-slate-300">
              {(["landing.story_feat1", "landing.story_feat2", "landing.story_feat3", "landing.story_feat4", "landing.story_feat5"] as const).map(
                (k) => (
                  <li key={k} className="flex gap-2">
                    <span className="text-[#00D084]">✅</span>
                    <span>{t(k)}</span>
                  </li>
                ),
              )}
            </ul>
            <button
              type="button"
              onClick={scrollToForm}
              className="mt-10 inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#00D084] hover:bg-white/5"
            >
              {t("landing.story_btn")}
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}

function ButtonPwa({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      {label}
    </button>
  );
}

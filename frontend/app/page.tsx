"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RechargeForm } from "@/components/RechargeForm";
import { useLang } from "@/lib/i18n/LanguageProvider";
import {
  Lightning,
  ShieldCheck,
  Globe,
  Users,
  Phone,
  CurrencyDollar,
  RocketLaunch,
} from "@phosphor-icons/react";

const OPERATOR_LOGOS = [
  { name: "Digicel", url: "https://logo.clearbit.com/digicelgroup.com" },
  { name: "Natcom", url: "https://logo.clearbit.com/natcom.com.ht" },
  { name: "AT&T", url: "https://logo.clearbit.com/att.com" },
  { name: "T-Mobile", url: "https://logo.clearbit.com/t-mobile.com" },
  { name: "Verizon", url: "https://logo.clearbit.com/verizon.com" },
  { name: "Rogers", url: "https://logo.clearbit.com/rogers.com" },
  { name: "Bell", url: "https://logo.clearbit.com/bell.ca" },
];

export default function HomePage() {
  const { t } = useLang();

  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1763386599810-e31937993312?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwZ3JlZW4lMjBhYnN0cmFjdCUyMGdyYWRpZW50JTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NzcxNTI5MTd8MA&ixlib=rb-4.1.0&q=85"
            alt=""
            fill
            priority
            className="object-cover opacity-50"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-ink/60 via-brand-ink/40 to-brand-ink/95" />
          <div className="absolute inset-0 bg-hero-radial" />
          <div className="noise" />
        </div>

        <Navbar variant="dark" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pb-28 lg:pt-16">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 backdrop-blur"
              data-testid="hero-badge"
            >
              <Lightning weight="fill" className="h-3.5 w-3.5" />
              {t("hero.badge")}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display mt-6 text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              data-testid="hero-title"
            >
              {t("hero.title")}
              <br />
              <span className="gradient-text">{t("hero.title2")}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 max-w-xl text-base text-white/70 sm:text-lg"
            >
              {t("hero.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
            >
              <TrustChip icon={<Lightning weight="duotone" className="h-4 w-4 text-emerald-300" />} label={t("trust.instant")} />
              <TrustChip icon={<ShieldCheck weight="duotone" className="h-4 w-4 text-emerald-300" />} label={t("trust.secure")} />
              <TrustChip icon={<Globe weight="duotone" className="h-4 w-4 text-emerald-300" />} label={t("trust.countries")} />
              <TrustChip icon={<Users weight="duotone" className="h-4 w-4 text-emerald-300" />} label={t("trust.customers")} />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5"
          >
            <RechargeForm />
          </motion.div>
        </div>

        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-brand-bg to-transparent" />
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-end gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">— {t("how.title")}</div>
              <h2 className="font-display mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                3 etap senp.<br /><span className="text-emerald-600">Voye lajan an mwens 30 segond.</span>
              </h2>
            </div>
            <p className="max-w-md text-sm text-black/60 sm:text-base">
              Our flow is built for trust and speed — the same engineering rigor as monican.shop, now applied to telecom.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Step n="01" icon={<Phone weight="duotone" className="h-7 w-7" />} title={t("how.s1.title")} desc={t("how.s1.desc")} />
            <Step n="02" icon={<CurrencyDollar weight="duotone" className="h-7 w-7" />} title={t("how.s2.title")} desc={t("how.s2.desc")} />
            <Step n="03" icon={<RocketLaunch weight="duotone" className="h-7 w-7" />} title={t("how.s3.title")} desc={t("how.s3.desc")} />
          </div>
        </div>
      </section>

      {/* OPERATORS */}
      <section className="border-t border-black/5 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">— {t("ops.title")}</div>
          <h3 className="font-display mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Digicel · Natcom · AT&T · T-Mobile · Verizon · Rogers · Bell
          </h3>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/5 bg-black/5 sm:grid-cols-4 lg:grid-cols-7">
            {OPERATOR_LOGOS.map((op) => (
              <div
                key={op.name}
                className="group flex h-24 items-center justify-center bg-white transition-all hover:bg-emerald-50"
                data-testid={`operator-logo-${op.name.toLowerCase().replace(/[^a-z]/g, "")}`}
              >
                <img
                  src={op.url}
                  alt={op.name}
                  className="max-h-10 w-auto grayscale transition-all duration-300 group-hover:grayscale-0"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-bg py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[32px] bg-brand-ink p-10 text-white sm:p-14">
            <div className="noise" />
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl" />
            <div className="absolute -left-10 -bottom-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
            <div className="relative grid items-center gap-8 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">— Ready?</div>
                <h3 className="font-display mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Voye premye recharge ou kounye a.
                </h3>
                <p className="mt-3 text-sm text-white/60">
                  Kreye yon kont gratis. Sove kontak yo. Voye an de klik.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/enskri" data-testid="cta-signup" className="btn-pill bg-brand-green text-white hover:bg-emerald-400">
                    Kreye Kont Gratis →
                  </Link>
                  <Link href="/konekte" data-testid="cta-login" className="btn-pill bg-white/10 text-white hover:bg-white/15">
                    Konekte
                  </Link>
                </div>
              </div>
              <div className="relative hidden sm:block">
                <Image
                  src="https://images.unsplash.com/photo-1768244016593-8ca75b15bc92?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHxwZW9wbGUlMjB1c2luZyUyMG1vYmlsZSUyMHBob25lJTIwc21pbGluZyUyMHZpYnJhbnR8ZW58MHx8fHwxNzc3MTUyODk4fDA&ixlib=rb-4.1.0&q=85"
                  alt=""
                  width={520}
                  height={520}
                  className="rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function TrustChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
      {icon} {label}
    </div>
  );
}

function Step({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-7 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_-30px_rgba(16,185,129,0.5)]">
      <div className="font-display text-7xl font-black tracking-tight text-black/[0.04] absolute right-4 top-2 select-none">{n}</div>
      <div className="relative">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">{icon}</div>
        <h4 className="font-display mt-5 text-xl font-bold tracking-tight">{title}</h4>
        <p className="mt-2 text-sm text-black/60">{desc}</p>
      </div>
    </div>
  );
}

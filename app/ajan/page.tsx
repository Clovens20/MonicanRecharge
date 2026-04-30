import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Vin Ajan Recharge Monican — recharge.monican.shop",
  description: "Rezo revandè Monican — komisyon sou chak recharge.",
};

const benefits = [
  "Komisyon % sou chak recharge ou vann",
  "Tableau de bord konplè pou swiv vant ou",
  "Lyen pèsonèl pou kliyan ou yo (?ref=KÒD-OU)",
  "Peman komisyon chak semèn (ak rapèl imèl)",
  "Soutyen dirèk WhatsApp",
];

export default function AjanLandingPage() {
  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar mode="agent" />
      <section className="relative overflow-hidden bg-brand-ink text-white">
        <div className="noise" />
        <div className="hero-radial absolute inset-0 opacity-90" />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">recharge.monican.shop/agent</div>
          <h1 className="font-display mt-4 text-4xl font-black tracking-tight sm:text-5xl">Vin Ajan Recharge Monican</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/75">Fè lajan vann recharge telefonik — Digicel, Natcom, 150+ peyi.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild variant="green" size="lg" className="rounded-full px-8">
              <Link href="/ajan/aplike">Aplike kòm Ajan Gratis →</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-white/30 bg-white/5 text-white hover:bg-white/10">
              <Link href="/konekte?next=%2Fagent">Deja ajan? Konekte</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-brand-ink">Poukisa vin ajan?</h2>
        <ul className="mt-6 space-y-4">
          {benefits.map((b) => (
            <li key={b} className="flex gap-3 text-brand-ink">
              <span className="text-emerald-500" aria-hidden>
                ✅
              </span>
              <span className="text-base font-medium">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-black/5 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-2xl font-bold text-brand-ink">Kijan li mache (3 etap)</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div className="rounded-3xl border border-black/5 bg-brand-bg p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-ink text-2xl text-white">⚡</div>
              <div className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">1</div>
              <p className="mt-2 font-display text-lg font-bold text-brand-ink">Aplike + Admin approve</p>
              <p className="mt-2 text-sm text-black/55">Ranpli fòm la — nou revize l nan 24-48 èdtan.</p>
            </div>
            <div className="rounded-3xl border border-black/5 bg-brand-bg p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-ink text-2xl text-white">🔗</div>
              <div className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">2</div>
              <p className="mt-2 font-display text-lg font-bold text-brand-ink">Jwenn lyen pèsonèl ou</p>
              <p className="mt-2 text-sm text-black/55">
                Egzanp: <span className="font-mono text-xs">recharge.monican.shop?ref=MON-AG-001</span>
              </p>
            </div>
            <div className="rounded-3xl border border-black/5 bg-brand-bg p-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-ink text-2xl text-white">📣</div>
              <div className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">3</div>
              <p className="mt-2 font-display text-lg font-bold text-brand-ink">Pataje + Komisyon</p>
              <p className="mt-2 text-sm text-black/55">Chak vann atravè lyen ou → komisyon otomatik.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold text-brand-ink">FAQ</h2>
        <dl className="mt-6 space-y-6 text-sm text-black/70">
          <div>
            <dt className="font-bold text-brand-ink">Konbyen mwen fè?</dt>
            <dd className="mt-1">Komisyon % la depann de kontra ou (egz. 3% — 8%). Admin mete l lè li apwouve w.</dd>
          </div>
          <div>
            <dt className="font-bold text-brand-ink">Kijan mwen resevwa lajan mwen?</dt>
            <dd className="mt-1">Nan tablo ajan ou, mande peman (Moncash oswa bank). Rapèl imèl chak Lendi si balans depase $5.</dd>
          </div>
          <div>
            <dt className="font-bold text-brand-ink">ZHONGJI / enprime resè?</dt>
            <dd className="mt-1">Boutik fizik Monican ka itilize enprimant thermik ak window.print — gade paramèt caisse sou paj /recharge apre koneksyon NIP kèsye a.</dd>
          </div>
        </dl>
        <div className="mt-10 text-center">
          <Button asChild variant="green" size="lg" className="rounded-full px-10">
            <Link href="/ajan/aplike">Kòmanse aplikasyon an</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  );
}

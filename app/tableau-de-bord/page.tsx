"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RechargeForm } from "@/components/RechargeForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { getTx, getContacts, ContactLocal, TxLocal } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Lightning, Phone, Plus, Wallet } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { getAutoPrintReceipt, setAutoPrintReceipt, getCashierName, setCashierName } from "@/lib/receipt/caisse";
import { LaunchExtras } from "@/components/dashboard/LaunchExtras";

export default function DashboardPage() {
  const { t } = useLang();
  const [tx, setTx] = useState<TxLocal[]>([]);
  const [contacts, setContacts] = useState<ContactLocal[]>([]);
  const [user, setUser] = useState<any>(null);
  const [hasAgent, setHasAgent] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [cashierInput, setCashierInput] = useState("");

  useEffect(() => {
    setAutoPrint(getAutoPrintReceipt());
    setCashierInput(getCashierName());
    setTx(getTx().slice(0, 5));
    setContacts(getContacts().slice(0, 6));
    const sb = createClient();
    if (sb) sb.auth.getUser().then(({ data }) => setUser(data.user));
    const refresh = () => setTx(getTx().slice(0, 5));
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  useEffect(() => {
    if (!user) {
      setHasAgent(false);
      return;
    }
    void fetch("/api/ajan/me")
      .then((r) => r.json())
      .then((d) => setHasAgent(Boolean(d?.agent)))
      .catch(() => setHasAgent(false));
  }, [user]);

  const greetName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Zanmi";
  const totalSent = tx.reduce((s, t) => s + (t.amount_usd || 0), 0);

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">— {t("nav.dashboard")}</div>
            <h1 data-testid="dashboard-greeting" className="font-display mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              {t("dash.greet")}, <span className="capitalize">{greetName}</span> 👋
            </h1>
          </div>
          <div className="flex gap-2">
            <Stat label="Total Sent" value={formatCurrency(totalSent)} icon={<Wallet weight="duotone" className="h-5 w-5" />} />
            <Stat label="Tranzaksyon" value={String(tx.length)} icon={<Lightning weight="duotone" className="h-5 w-5" />} />
          </div>
        </div>

        {hasAgent ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <Link href="/tableau-de-bord/ajan" className="font-bold text-emerald-800 underline underline-offset-2 hover:text-emerald-900">
              {t("nav.agent_dash")} →
            </Link>
          </div>
        ) : null}

        <div className="mt-6 rounded-3xl border border-black/5 bg-white p-5 sm:p-6" data-testid="caisse-settings">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">— {t("caisse.title")}</div>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/5 bg-brand-bg p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-emerald-600"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
              />
              <span className="text-sm font-medium text-brand-ink">{t("caisse.auto_print")}</span>
            </label>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-black/45">{t("caisse.cashier")}</div>
              <input
                value={cashierInput}
                onChange={(e) => setCashierInput(e.target.value)}
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-medium outline-none ring-emerald-100 focus:border-emerald-500 focus:ring-4"
                placeholder="Jean"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              setAutoPrintReceipt(autoPrint);
              setCashierName(cashierInput);
              toast.success(t("caisse.saved"));
            }}
          >
            {t("caisse.save")}
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-black/50">{t("caisse.note")}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">— {t("dash.quick")}</div>
            <div className="mt-3">
              <RechargeForm />
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5">
            {/* Saved contacts */}
            <div className="rounded-3xl border border-black/5 bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold tracking-tight">{t("dash.saved")}</h3>
                <Link data-testid="link-contacts" href="/kontak" className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 hover:underline">{t("contacts.add")} +</Link>
              </div>
              {contacts.length === 0 ? (
                <div data-testid="empty-contacts" className="mt-5 rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/50">
                  {t("dash.empty_contacts")}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {contacts.map((c) => (
                    <Link
                      key={c.id}
                      href={`/?phone=${encodeURIComponent(c.phone)}`}
                      className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-brand-bg p-3 text-left hover:border-emerald-400"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-lg">{c.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-sm font-bold tracking-tight">{c.name}</div>
                        <div className="truncate font-mono text-[11px] text-black/50">{c.phone}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-black/30 group-hover:text-emerald-600" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent transactions */}
            <div className="rounded-3xl border border-black/5 bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold tracking-tight">{t("dash.recent")}</h3>
                <Link data-testid="link-history" href="/istwa" className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 hover:underline">{t("nav.history")} →</Link>
              </div>
              {tx.length === 0 ? (
                <div data-testid="empty-tx" className="mt-5 rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/50">
                  {t("dash.empty_tx")}
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-black/5">
                  {tx.map((t2) => (
                    <li key={t2.id} className="flex items-center gap-3 py-3" data-testid={`tx-${t2.id}`}>
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-bg text-lg">{t2.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-sm font-bold tracking-tight">{t2.operator}</div>
                        <div className="font-mono text-[11px] text-black/50">{t2.recipient}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-sm font-extrabold tracking-tight">{formatCurrency(t2.amount_usd)}</div>
                        <Badge variant={t2.status === "siksè" ? "green" : t2.status === "annatant" ? "gold" : "red"}>
                          {t2.status === "siksè" ? "OK" : t2.status === "annatant" ? "WAIT" : "FAIL"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <LaunchExtras />
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">{icon}</div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/40">{label}</div>
        <div className="font-display text-base font-extrabold tracking-tight">{value}</div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { OPERATORS } from "@/lib/reloadly/mock";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Sched = {
  id: string;
  nimewo: string;
  operateur_id: number;
  montant: number;
  frekans: string;
  pwochen_dat: string;
  aktif: boolean;
  stripe_payment_method_id: string | null;
};

export function LaunchExtras() {
  const { t } = useLang();
  const [authed, setAuthed] = useState(false);
  const [pwen, setPwen] = useState<{ total: number; rebate: number } | null>(null);
  const [ref, setRef] = useState<{ shareUrl: string; kredi: number } | null>(null);
  const [sched, setSched] = useState<Sched[]>([]);
  const [opId, setOpId] = useState(OPERATORS.find((o) => o.countryCode === "HT")?.id || 1);
  const [phone, setPhone] = useState("");
  const [amt, setAmt] = useState("10");
  const [freq, setFreq] = useState("chak_semèn");
  const [pm, setPm] = useState("");
  const [cust, setCust] = useState("");

  const load = useCallback(async () => {
    const [pr, rr, sr] = await Promise.all([fetch("/api/me/pwen"), fetch("/api/referal/me"), fetch("/api/rechaj-otomatik")]);
    if (pr.status === 401) {
      setPwen(null);
      setRef(null);
      setSched([]);
      return;
    }
    const [p, r, s] = await Promise.all([pr.json(), rr.json(), sr.json()]);
    if (!p.error) setPwen({ total: p.pwen_total || 0, rebate: p.rebate_usd || 0 });
    if (!r.error) setRef({ shareUrl: r.shareUrl || "", kredi: r.krediBalans || 0 });
    if (!s.error) setSched(s.rows || []);
  }, []);

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    void sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      await fetch("/api/referal/setup", { method: "POST" }).catch(() => {});
      await fetch("/api/referal/claim", { method: "POST" }).catch(() => {});
      load();
    });
  }, [load]);

  if (!authed) return null;

  async function addSchedule(e: React.FormEvent) {
    e.preventDefault();
    const montant = parseFloat(amt);
    if (!phone.replace(/\D/g, "").slice(-8)) return toast.error(t("dash.auto_phone_err"));
    const r = await fetch("/api/rechaj-otomatik", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nimewo: phone.replace(/\D/g, ""),
        operateur_id: opId,
        montant,
        frekans: freq,
        stripe_payment_method_id: pm.trim() || null,
        stripe_customer_id: cust.trim() || null,
        snapshot: {
          operatorId: opId,
          amount: montant,
          type: "airtime",
          recipientPhone: { countryCode: "HT", number: phone.replace(/\D/g, "") },
        },
      }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Erè");
    toast.success(t("dash.auto_saved"));
    setPhone("");
    load();
  }

  async function toggle(id: string, aktif: boolean) {
    const r = await fetch("/api/rechaj-otomatik", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, aktif }),
    });
    if (!r.ok) return toast.error("Erè");
    load();
  }

  const htOps = OPERATORS.filter((o) => o.countryCode === "HT");

  return (
    <div className="space-y-6">
      {pwen != null && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">{t("dash.loyalty_title")}</div>
          <p className="mt-2 font-display text-lg font-bold text-brand-ink">
            {t("dash.loyalty_line")
              .replace("{{n}}", String(pwen.total))
              .replace("{{usd}}", formatCurrency(pwen.rebate))}
          </p>
        </div>
      )}

      {ref && (
        <div className="rounded-3xl border border-black/5 bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">{t("dash.referral_title")}</div>
          <p className="mt-1 text-sm text-black/60">{t("dash.referral_desc")}</p>
          <p className="mt-2 text-xs text-black/45">
            {t("dash.referral_credit")}: <strong>{formatCurrency(ref.kredi)}</strong>
          </p>
          {ref.shareUrl ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Input readOnly value={ref.shareUrl} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(ref.shareUrl);
                  toast.success(t("dash.referral_copied"));
                }}
              >
                {t("dash.referral_copy")}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-3xl border border-black/5 bg-white p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">⏰ {t("dash.auto_title")}</div>
        <p className="mt-1 text-xs text-black/50">{t("dash.auto_note")}</p>
        <form onSubmit={addSchedule} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={opId}
            onChange={(e) => setOpId(Number(e.target.value))}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium"
          >
            {htOps.map((o) => (
              <option key={o.id} value={o.id}>
                {o.flag} {o.name}
              </option>
            ))}
          </select>
          <Input placeholder={t("dash.auto_phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input type="number" min={1} step={1} value={amt} onChange={(e) => setAmt(e.target.value)} />
          <select value={freq} onChange={(e) => setFreq(e.target.value)} className="rounded-xl border border-black/10 px-3 py-2 text-sm">
            <option value="chak_semèn">{t("dash.auto_freq_w")}</option>
            <option value="chak_2semèn">{t("dash.auto_freq_2w")}</option>
            <option value="chak_mwa">{t("dash.auto_freq_m")}</option>
          </select>
          <Input placeholder="Stripe pm_…" value={pm} onChange={(e) => setPm(e.target.value)} className="font-mono text-xs" />
          <Input placeholder="Stripe cus_…" value={cust} onChange={(e) => setCust(e.target.value)} className="font-mono text-xs" />
          <Button type="submit" variant="green" className="sm:col-span-2">
            {t("dash.auto_submit")}
          </Button>
        </form>

        <ul className="mt-4 space-y-2 text-sm">
          {sched.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-brand-bg px-3 py-2">
              <span className="font-mono text-xs">
                {r.nimewo} · ${r.montant} · {r.frekans} · {r.pwochen_dat}
              </span>
              <span className={r.aktif ? "text-emerald-700" : "text-black/40"}>{r.aktif ? t("dash.auto_active") : t("dash.auto_paused")}</span>
              <div className="flex gap-1">
                {r.aktif ? (
                  <Button size="sm" variant="outline" type="button" onClick={() => toggle(r.id, false)}>
                    {t("dash.auto_pause")}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" type="button" onClick={() => toggle(r.id, true)}>
                    {t("dash.auto_resume")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {sched.length === 0 && <p className="mt-2 text-xs text-black/45">{t("dash.auto_empty")}</p>}
      </div>

    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Apl = {
  id: string;
  non_konplè: string;
  imèl: string;
  vil: string | null;
  peyi: string | null;
  created_at: string;
};

type Ag = {
  user_id: string;
  kòd_ajan: string;
  non_biznis: string | null;
  vil: string | null;
  peyi: string | null;
  total_tranzaksyon: number;
  balans_komisyon: number;
  to_komisyon: number;
  estati: string;
};

type Dem = { id: string; ajan_id: string; montant: number; detay: string; created_at: string };
type HelpReq = {
  id: string;
  ajan_id: string;
  sijè: string;
  mesaj: string;
  estati: "ouvè" | "ankou" | "rezoud" | "fèmen";
  admin_nòt: string | null;
  created_at: string;
};

type AuditTx = {
  id: string;
  created_at: string;
  estati: string | null;
  montant_usd: number | null;
  mòd_peman: string | null;
  ref_kòd: string | null;
  komisyon_ajan: number | null;
  nimewo_resevwa: string | null;
};

type AuditKom = {
  id: string;
  created_at: string;
  tranzaksyon_ref: string;
  montant_komisyon: number;
  estati: string;
  nòt_admin: string | null;
};

type AuditPayload = {
  agent: Ag;
  tranzaksyon: AuditTx[];
  komisyon: AuditKom[];
};

export default function AdminAjanPage() {
  const [tab, setTab] = useState<"app" | "actif" | "demann" | "kredi" | "aide">("app");
  const [apps, setApps] = useState<Apl[]>([]);
  const [agents, setAgents] = useState<Ag[]>([]);
  const [demann, setDemann] = useState<Dem[]>([]);
  const [helps, setHelps] = useState<HelpReq[]>([]);
  const [pctById, setPctById] = useState<Record<string, string>>({});
  const [forbidden, setForbidden] = useState<"login" | "denied" | null>(null);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [krediUserId, setKrediUserId] = useState<string>("");
  const [krediAudit, setKrediAudit] = useState<AuditPayload | null>(null);
  const [krediLoading, setKrediLoading] = useState(false);
  const [krediMontant, setKrediMontant] = useState("");
  const [krediNòt, setKrediNòt] = useState("");
  const [krediTxId, setKrediTxId] = useState("");
  const [krediSaving, setKrediSaving] = useState(false);
  const [helpBusyId, setHelpBusyId] = useState<string | null>(null);
  const [topupNotifyOn, setTopupNotifyOn] = useState(false);
  const [topupNotifySaving, setTopupNotifySaving] = useState(false);

  async function load() {
    const [ra, rg, rd, rh, rn] = await Promise.all([
      fetch("/api/admin/ajan/applications"),
      fetch("/api/admin/ajan/active"),
      fetch("/api/admin/ajan/demandes-peman"),
      fetch("/api/admin/ajan/help-requests"),
      fetch("/api/admin/ajan-topup-notify"),
    ]);
    if (ra.status === 401 || rg.status === 401) {
      setForbidden("login");
      return;
    }
    const [a, g, d, h, n] = await Promise.all([ra.json(), rg.json(), rd.json(), rh.json(), rn.json()]);
    if (a.error === "Forbidden" || g.error === "Forbidden") {
      setForbidden("denied");
      return;
    }
    setForbidden(null);
    setApps(a.applications || []);
    setAgents(g.agents || []);
    setDemann(d.demandes || []);
    setHelps(h.demandes || []);
    if (rn.ok && typeof n.on === "boolean") setTopupNotifyOn(n.on);
  }

  async function toggleTopupNotify() {
    setTopupNotifySaving(true);
    try {
      const r = await fetch("/api/admin/ajan-topup-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: !topupNotifyOn }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Erè");
      setTopupNotifyOn(Boolean(j.on));
      toast.success(j.on ? "Notifikasyon top-up aktive." : "Notifikasyon top-up etenn.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erè");
    } finally {
      setTopupNotifySaving(false);
    }
  }

  async function loadKrediAudit(uid: string) {
    if (!uid) {
      setKrediAudit(null);
      return;
    }
    setKrediLoading(true);
    try {
      const r = await fetch(`/api/admin/ajan/credit-audit?userId=${encodeURIComponent(uid)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(data.error || "Erè audit");
        setKrediAudit(null);
        return;
      }
      setKrediAudit(data as AuditPayload);
    } finally {
      setKrediLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab !== "kredi") return;
    if (agents.length === 0) return;
    if (!krediUserId) {
      setKrediUserId(agents[0].user_id);
      return;
    }
    void loadKrediAudit(krediUserId);
  }, [tab, krediUserId, agents]);

  async function approve(id: string) {
    const pct = parseFloat(pctById[id] || "5");
    const res = await fetch("/api/admin/ajan/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aplasyonId: id, toKomisyon: pct }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Erè");
    const suffix =
      data.invite_sent === true
        ? " Imèl envitasyon Supabase voye (kreye modpas)."
        : data.existing_account === true
          ? " Kont te deja egziste — gade imèl ou."
          : "";
    toast.success(`Apwouve — ${data.kòd_ajan || ""}.${suffix}`);
    load();
  }

  async function reject(id: string) {
    const res = await fetch("/api/admin/ajan/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aplasyonId: id }),
    });
    if (!res.ok) return toast.error("Erè");
    toast.success("Refize");
    load();
  }

  async function addKrediKomisyon() {
    const uid = krediUserId.trim();
    const m = parseFloat(krediMontant.replace(",", "."));
    if (!uid || !Number.isFinite(m) || m <= 0) {
      toast.error("Chwazi ajan epi antre yon montan valab");
      return;
    }
    setKrediSaving(true);
    try {
      const res = await fetch("/api/admin/ajan/add-komisyon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ajanUserId: uid,
          montant: m,
          nòt: krediNòt.trim() || undefined,
          tranzaksyonId: krediTxId.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Erè");
      toast.success(`Kredi ajoute — nouvo balans: ${formatCurrency(Number(data.newBalans || 0))}`);
      setKrediMontant("");
      setKrediNòt("");
      setKrediTxId("");
      await loadKrediAudit(uid);
      load();
    } finally {
      setKrediSaving(false);
    }
  }

  async function resendAgentLink(userId: string) {
    setResendingUserId(userId);
    try {
      const res = await fetch("/api/admin/ajan/resend-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Erè");
      toast.success(
        data.kind === "temporary_password"
          ? "Imèl voye (lyen + modpas tanporè, chanjman obligatwa 1er login)."
          : "Imèl voye."
      );
    } finally {
      setResendingUserId(null);
    }
  }

  async function payAgent(userId: string, montant: number) {
    const res = await fetch("/api/admin/ajan/pay-commission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ajanUserId: userId,
        montant,
        mòd_peman: "admin",
        referans: `PAY-${Date.now()}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Erè");
    toast.success("Peman anrejistre");
    load();
  }

  async function setHelpStatus(id: string, estati: "ankou" | "rezoud" | "fèmen") {
    setHelpBusyId(id);
    try {
      const res = await fetch("/api/admin/ajan/help-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estati }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Erè");
      toast.success("Demann mete ajou.");
      load();
    } finally {
      setHelpBusyId(null);
    }
  }

  if (forbidden === "login") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-xl font-bold">Konekte</h1>
        <p className="mt-2 text-sm text-black/55">Ou dwe konekte kòm admin.</p>
        <Button asChild className="mt-6" variant="green">
          <Link href="/konekte">Konekte</Link>
        </Button>
      </div>
    );
  }

  if (forbidden === "denied") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-xl font-bold">Aksè refize</h1>
        <p className="mt-2 text-sm text-black/55">Imèl ou dwe nan ADMIN_EMAILS nan .env</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/">Akèy</Link>
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl">
        <h1 className="font-display text-3xl font-black tracking-tight text-brand-ink">Admin — Ajan yo</h1>
        <p className="mt-1 text-sm text-black/55">Jere aplikasyon, ajan aktif, ak demann peman.</p>

        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-brand-ink">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm font-bold">Avèti m lè yon ajan achte kredi marchand</div>
              <p className="mt-1 text-xs leading-relaxed text-black/55">
                Yon imèl (Resend) apre chak top-up Stripe reyisi. Destinataè:{" "}
                <code className="rounded bg-white/90 px-1 text-[11px]">ADMIN_NOTIFY_EMAIL</code> si li defini, sinon
                premye imèl nan <code className="rounded bg-white/90 px-1 text-[11px]">ADMIN_EMAILS</code>. Fonksyon
                Supabase <code className="rounded bg-white/90 px-1 text-[11px]">verifye-stripe</code> bezwen{" "}
                <code className="rounded bg-white/90 px-1 text-[11px]">RESEND_API_KEY</code> nan sekre li tou.
              </p>
            </div>
            <Button
              type="button"
              variant={topupNotifyOn ? "green" : "outline"}
              size="sm"
              className="shrink-0"
              disabled={topupNotifySaving}
              onClick={() => void toggleTopupNotify()}
            >
              {topupNotifySaving ? "…" : topupNotifyOn ? "Notifikasyon: ON" : "Notifikasyon: OFF"}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["app", "actif", "demann", "kredi", "aide"] as const).map((t) => (
            <Button key={t} variant={tab === t ? "green" : "outline"} size="sm" onClick={() => setTab(t)}>
              {t === "app"
                ? "Aplikasyon"
                : t === "actif"
                  ? "Ajan aktif"
                  : t === "demann"
                    ? "Demann peman"
                    : t === "kredi"
                      ? "Kredi komisyon"
                      : "Demann èd"}
            </Button>
          ))}
        </div>

        {tab === "app" && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-black/10 bg-brand-bg text-xs uppercase tracking-wider text-black/45">
                <tr>
                  <th className="p-3">Non</th>
                  <th className="p-3">Imèl</th>
                  <th className="p-3">Vil</th>
                  <th className="p-3">Dat</th>
                  <th className="p-3">%</th>
                  <th className="p-3">Aksyon</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((p) => (
                  <tr key={p.id} className="border-b border-black/5">
                    <td className="p-3 font-medium">{p.non_konplè}</td>
                    <td className="p-3 font-mono text-xs">{p.imèl}</td>
                    <td className="p-3 text-black/60">{p.vil || "—"}</td>
                    <td className="p-3 text-black/60">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Input
                        className="h-9 w-16"
                        placeholder="5"
                        value={pctById[p.id] ?? ""}
                        onChange={(e) => setPctById((s) => ({ ...s, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="green" onClick={() => approve(p.id)}>
                          Apwouve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject(p.id)}>
                          Refize
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {apps.length === 0 && <p className="p-6 text-sm text-black/45">Pa gen aplikasyon annatant.</p>}
          </div>
        )}

        {tab === "actif" && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-black/5 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-black/10 bg-brand-bg text-xs uppercase tracking-wider text-black/45">
                <tr>
                  <th className="p-3">Kòd</th>
                  <th className="p-3">Biznis</th>
                  <th className="p-3">Tx</th>
                  <th className="p-3">Balans</th>
                  <th className="p-3">%</th>
                  <th className="p-3">Peman / lyen</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.user_id} className="border-b border-black/5">
                    <td className="p-3 font-mono font-bold">{a.kòd_ajan}</td>
                    <td className="p-3">{a.non_biznis || "—"}</td>
                    <td className="p-3">{a.total_tranzaksyon}</td>
                    <td className="p-3 font-semibold text-emerald-700">{formatCurrency(Number(a.balans_komisyon))}</td>
                    <td className="p-3">{a.to_komisyon}%</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resendingUserId === a.user_id}
                          onClick={() => void resendAgentLink(a.user_id)}
                        >
                          {resendingUserId === a.user_id ? "Voye…" : "Voye lyen"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Number(a.balans_komisyon) <= 0}
                          onClick={() => payAgent(a.user_id, Number(a.balans_komisyon))}
                        >
                          Peye tout
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "demann" && (
          <div className="mt-8 space-y-3">
            {demann.map((d) => (
              <div key={d.id} className="rounded-2xl border border-black/5 bg-white p-4 text-sm">
                <div className="font-mono text-xs text-black/45">{d.ajan_id}</div>
                <div className="mt-1 font-bold">{formatCurrency(Number(d.montant))}</div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-black/70">{d.detay}</pre>
                <div className="mt-2 text-xs text-black/40">{new Date(d.created_at).toLocaleString()}</div>
              </div>
            ))}
            {demann.length === 0 && <p className="text-sm text-black/45">Pa gen demann.</p>}
          </div>
        )}

        {tab === "kredi" && (
          <div className="mt-8 space-y-6">
            <p className="text-sm text-black/55">
              Gade dènye tranzaksyon Stripe / Reloadly ajan an (sòti sou tablo a) epi liy komisyon yo. Si kredi pa rantre,
              antre montan USD + nòt, epi opsyonèlman ID tranzaksyon Supabase pou evite doublon.
            </p>
            {agents.length === 0 ? (
              <p className="text-sm text-black/45">Pa gen ajan aktif.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-black/45">Ajan</label>
                    <select
                      className="h-10 min-w-[220px] rounded-lg border border-black/10 bg-white px-3 text-sm"
                      value={krediUserId}
                      onChange={(e) => setKrediUserId(e.target.value)}
                    >
                      {agents.map((a) => (
                        <option key={a.user_id} value={a.user_id}>
                          {a.kòd_ajan} — {a.non_biznis || "—"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadKrediAudit(krediUserId)}>
                    Rafrechi
                  </Button>
                </div>

                {krediLoading ? (
                  <p className="text-sm text-black/45">Chajman…</p>
                ) : krediAudit ? (
                  <>
                    <div className="rounded-2xl border border-black/5 bg-emerald-50/50 p-4 text-sm">
                      <span className="font-semibold text-brand-ink">Balans komisyon kounye a: </span>
                      <span className="font-mono font-bold text-emerald-800">
                        {formatCurrency(Number(krediAudit.agent.balans_komisyon || 0))}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white p-4">
                      <h2 className="font-display text-sm font-bold text-brand-ink">Tranzaksyon (dènye 40, user_id)</h2>
                      <div className="mt-2 overflow-x-auto text-xs">
                        <table className="w-full min-w-[640px] text-left">
                          <thead className="border-b text-black/45">
                            <tr>
                              <th className="py-2 pr-2">Dat</th>
                              <th className="py-2 pr-2">ID</th>
                              <th className="py-2 pr-2">Estati</th>
                              <th className="py-2 pr-2">Montan</th>
                              <th className="py-2 pr-2">Kom. prevu</th>
                              <th className="py-2 pr-2">Ref</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(krediAudit.tranzaksyon || []).map((tx) => (
                              <tr key={tx.id} className="border-b border-black/5">
                                <td className="py-1.5 pr-2 text-black/60">{new Date(tx.created_at).toLocaleString()}</td>
                                <td className="py-1.5 pr-2 font-mono text-[10px]">{tx.id.slice(0, 8)}…</td>
                                <td className="py-1.5 pr-2">{tx.estati || "—"}</td>
                                <td className="py-1.5 pr-2">{formatCurrency(Number(tx.montant_usd || 0))}</td>
                                <td className="py-1.5 pr-2">{formatCurrency(Number(tx.komisyon_ajan || 0))}</td>
                                <td className="py-1.5 pr-2 font-mono">{tx.ref_kòd || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(krediAudit.tranzaksyon || []).length === 0 && (
                          <p className="mt-2 text-black/45">Pa gen tranzaksyon.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white p-4">
                      <h2 className="font-display text-sm font-bold text-brand-ink">Liy komisyon (dènye 40)</h2>
                      <div className="mt-2 overflow-x-auto text-xs">
                        <table className="w-full min-w-[560px] text-left">
                          <thead className="border-b text-black/45">
                            <tr>
                              <th className="py-2 pr-2">Dat</th>
                              <th className="py-2 pr-2">Ref tranz.</th>
                              <th className="py-2 pr-2">Montan</th>
                              <th className="py-2 pr-2">Nòt admin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(krediAudit.komisyon || []).map((k) => (
                              <tr key={k.id} className="border-b border-black/5">
                                <td className="py-1.5 pr-2 text-black/60">{new Date(k.created_at).toLocaleString()}</td>
                                <td className="py-1.5 pr-2 font-mono text-[10px]">{k.tranzaksyon_ref}</td>
                                <td className="py-1.5 pr-2 font-semibold text-emerald-800">
                                  {formatCurrency(Number(k.montant_komisyon))}
                                </td>
                                <td className="py-1.5 pr-2 text-black/70">{k.nòt_admin || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(krediAudit.komisyon || []).length === 0 && (
                          <p className="mt-2 text-black/45">Pa gen liy komisyon.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-white p-6">
                      <h2 className="font-display text-sm font-bold text-brand-ink">Ajoute kredi manyèl (USD)</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <label className="text-xs font-semibold text-black/45">Montant *</label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="ex. 2.50"
                            value={krediMontant}
                            onChange={(e) => setKrediMontant(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-1">
                          <label className="text-xs font-semibold text-black/45">ID tranzaksyon (opsyonèl)</label>
                          <Input
                            className="font-mono text-xs"
                            placeholder="UUID depi tablo anwo a"
                            value={krediTxId}
                            onChange={(e) => setKrediTxId(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-3 grid gap-1">
                        <label className="text-xs font-semibold text-black/45">Nòt (obligatwa — audit)</label>
                        <Input
                          placeholder="Ex: Stripe OK men komisyon pa t rantre"
                          value={krediNòt}
                          onChange={(e) => setKrediNòt(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="green"
                        className="mt-4"
                        disabled={krediSaving || !krediNòt.trim()}
                        onClick={() => void addKrediKomisyon()}
                      >
                        {krediSaving ? "Anrejistre…" : "Ajoute kredi"}
                      </Button>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
        )}

        {tab === "aide" && (
          <div className="mt-8 space-y-3">
            {helps.map((h) => (
              <div key={h.id} className="rounded-2xl border border-black/5 bg-white p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-mono text-[11px] text-black/45">{h.ajan_id}</div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{h.estati}</div>
                </div>
                <div className="mt-2 font-semibold text-brand-ink">{h.sijè}</div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-black/70">{h.mesaj}</pre>
                <div className="mt-2 text-xs text-black/40">{new Date(h.created_at).toLocaleString()}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={helpBusyId === h.id}
                    onClick={() => void setHelpStatus(h.id, "ankou")}
                  >
                    An kou
                  </Button>
                  <Button
                    size="sm"
                    variant="green"
                    disabled={helpBusyId === h.id}
                    onClick={() => void setHelpStatus(h.id, "rezoud")}
                  >
                    Rezoud
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={helpBusyId === h.id}
                    onClick={() => void setHelpStatus(h.id, "fèmen")}
                  >
                    Fèmen
                  </Button>
                </div>
              </div>
            ))}
            {helps.length === 0 && <p className="text-sm text-black/45">Pa gen demann èd.</p>}
          </div>
        )}
    </section>
  );
}

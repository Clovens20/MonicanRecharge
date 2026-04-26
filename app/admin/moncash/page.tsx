"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Row = {
  id: string;
  order_public_id: string;
  amount_usd: number;
  payload: { recharge: unknown };
  screenshot_url: string | null;
  estati: string;
  created_at: string;
};

export default function AdminMoncashPage() {
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    const r = await fetch("/api/admin/moncash/list");
    if (r.status === 401) return toast.error("Konekte");
    const d = await r.json();
    if (d.error) return toast.error(d.error);
    setRows(d.rows || []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, []);

  async function konfime(orderPublicId: string) {
    const r = await fetch("/api/admin/moncash/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderPublicId }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Erè");
    toast.success(`Konfime — ${d.reference || ""}`);
    load();
  }

  async function refize(orderPublicId: string) {
    const nòt = window.prompt("Rezon refi?");
    const r = await fetch("/api/admin/moncash/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderPublicId, nòt }),
    });
    if (!r.ok) return toast.error("Erè");
    toast.success("Refize");
    load();
  }

  const pending = rows.filter((x) => x.estati === "annatant");

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-brand-ink">Moncash — verifikasyon</h1>
      <p className="mt-1 text-sm text-black/55">Lis an tan reyèl (polling 6s). {pending.length} annatant.</p>

      <div className="mt-6 space-y-6">
        {pending.map((row) => {
          const pay = row.payload as {
            recharge?: {
              userEmail?: string | null;
              recipientPhone?: { countryCode?: string; number?: string };
              operatorId?: number;
            };
            refKod?: string | null;
          } | null;
          const em = pay?.recharge?.userEmail;
          const ph = pay?.recharge?.recipientPhone;
          const phoneLine =
            ph?.number && ph?.countryCode
              ? `${ph.countryCode === "HT" ? "+509" : "+" + ph.countryCode} ${ph.number}`
              : null;
          return (
          <div key={row.id} className="rounded-2xl border border-black/5 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-black/45">{row.order_public_id}</div>
                <div className="font-display text-lg font-bold">{formatCurrency(Number(row.amount_usd))}</div>
                {em ? <div className="text-xs text-black/60">Itilizatè: {em}</div> : null}
                {phoneLine ? <div className="text-xs font-mono text-black/70">Recharge: {phoneLine}</div> : null}
                {pay?.refKod ? <div className="text-xs text-black/50">Ref ajan: {pay.refKod}</div> : null}
                <div className="text-xs text-black/50">{new Date(row.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="green" onClick={() => konfime(row.order_public_id)}>
                  ✅ Konfime
                </Button>
                <Button size="sm" variant="outline" onClick={() => refize(row.order_public_id)}>
                  ❌ Refize
                </Button>
              </div>
            </div>
            {row.screenshot_url ? (
              <div className="mt-3 max-w-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.screenshot_url}
                  alt="screenshot"
                  className="max-h-[300px] w-full rounded-lg border border-black/10 object-contain"
                />
              </div>
            ) : (
              <div className="mt-2 text-xs text-amber-700">Tann screenshot…</div>
            )}
          </div>
        );
        })}
        {pending.length === 0 && <p className="text-sm text-black/45">Pa gen peman Moncash annatant.</p>}
      </div>
    </div>
  );
}

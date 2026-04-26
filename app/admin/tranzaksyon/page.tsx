"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Tx = {
  id?: string;
  reference?: string;
  created_at?: string;
  channel?: string;
  recipient?: string;
  operator?: string;
  amount_usd?: number;
  cost_usd?: number;
  profit?: number;
  status?: string;
  payment_method?: string;
  user_email?: string | null;
  refunded?: boolean;
};

function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channel, setChannel] = useState("");
  const [operator, setOperator] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Tx | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", new Date(from).toISOString());
    if (to) p.set("to", new Date(to + "T23:59:59").toISOString());
    if (channel) p.set("channel", channel);
    if (operator) p.set("operator", operator);
    if (status) p.set("status", status);
    if (q.trim()) p.set("q", q.trim());
    p.set("limit", "300");
    return p.toString();
  }, [from, to, channel, operator, status, q]);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/transactions?${qs}`);
    if (r.status === 401) return toast.error("Konekte");
    if (r.status === 403) return toast.error("Aksè refize");
    const d = await r.json();
    if (d.error) return toast.error(d.error);
    setRows(d.transactions || []);
  }, [qs]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const u = new URLSearchParams(window.location.search);
      const qq = u.get("q");
      if (qq) setQ(qq);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const header = ["ID", "Date", "Channel", "Phone", "Operator", "Amount", "Cost", "Profit", "Status", "Reference"];
    const lines = [header.join(",")];
    for (const t of rows) {
      lines.push(
        [
          csvEscape(t.id || ""),
          csvEscape(t.created_at || ""),
          csvEscape(t.channel || ""),
          csvEscape(t.recipient || ""),
          csvEscape(t.operator || ""),
          String(t.amount_usd ?? ""),
          String(t.cost_usd ?? ""),
          String(t.profit ?? ""),
          csvEscape(t.status || ""),
          csvEscape(t.reference || ""),
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tranzaksyon-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV telechaje");
  }

  function exportPdf() {
    window.print();
  }

  async function refund(ref: string | undefined) {
    if (!ref) return;
    if (!window.confirm(`Rembousman pou ${ref} ?`)) return;
    const r = await fetch("/api/admin/transactions/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: ref }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Erè");
    toast.success("Rembousman make");
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-brand-ink">Tranzaksyon</h1>
      <p className="mt-1 text-sm text-black/55">Tablo konplè, filtè, ekspòtasyon.</p>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        <Input placeholder="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="w-28" />
        <Input placeholder="Operatè" value={operator} onChange={(e) => setOperator(e.target.value)} className="w-28" />
        <Input placeholder="Estati" value={status} onChange={(e) => setStatus(e.target.value)} className="w-28" />
        <Input placeholder="Chèche (telefòn, ref, id)" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
        <Button variant="outline" size="sm" onClick={load}>
          Rafrechi
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={exportPdf}>
          PDF (enprime)
        </Button>
      </div>

      <div id="admin-tx-print" className="mt-6 overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-black/5 bg-brand-bg text-xs uppercase tracking-wide text-black/50">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Dat</th>
              <th className="p-3">Chèn</th>
              <th className="p-3">Telefòn</th>
              <th className="p-3">Operatè</th>
              <th className="p-3">Montan</th>
              <th className="p-3">Kò</th>
              <th className="p-3">Pwofi</th>
              <th className="p-3">Estati</th>
              <th className="p-3 print:hidden">Aksyon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id || t.reference} className="border-b border-black/5 hover:bg-black/[0.02]">
                <td className="p-2 font-mono text-[11px] text-black/55">{t.id?.slice(0, 8)}…</td>
                <td className="p-2 text-xs whitespace-nowrap">{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</td>
                <td className="p-2">{t.channel || "—"}</td>
                <td className="p-2 font-mono text-xs">{t.recipient || "—"}</td>
                <td className="p-2">{t.operator || "—"}</td>
                <td className="p-2 font-semibold">{formatCurrency(Number(t.amount_usd || 0))}</td>
                <td className="p-2 text-black/60">{formatCurrency(Number(t.cost_usd ?? 0))}</td>
                <td className="p-2 text-emerald-800">{formatCurrency(Number(t.profit ?? 0))}</td>
                <td className="p-2 text-xs">{t.status || "—"}{t.refunded ? " · rembouse" : ""}</td>
                <td className="p-2 print:hidden">
                  <Button variant="outline" size="sm" className="mr-1 h-7 text-xs" onClick={() => setDetail(t)}>
                    Detay
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={t.refunded || !t.reference}
                    onClick={() => refund(t.reference)}
                  >
                    Rembousman
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-black/45">Pa gen rezilta.</p>}
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-lg font-bold">Detay tranzaksyon</h2>
              <Button variant="outline" size="sm" onClick={() => setDetail(null)}>
                Fèmen
              </Button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-brand-bg p-4 text-xs">{JSON.stringify(detail, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

type Row = {
  id: string;
  non_boutik: string;
  non_complet?: string | null;
  email?: string | null;
  tel?: string | null;
  nip_temp?: boolean | null;
  aktif: boolean;
  created_at: string;
};

export default function AdminKesyePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [non, setNon] = useState("");
  const [nonComplet, setNonComplet] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [nip, setNip] = useState("");
  const [forbidden, setForbidden] = useState<"login" | "denied" | null>(null);

  async function load() {
    const r = await fetch("/api/admin/kesye");
    if (r.status === 401) return setForbidden("login");
    if (r.status === 403) return setForbidden("denied");
    const d = await r.json();
    if (d.error) return toast.error(d.error);
    setForbidden(null);
    setRows(d.rows || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/kesye", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ non_boutik: non, non_complet: nonComplet, email, tel, nip }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Erè");
    toast.success("Agent kèsye kreye (NIP proviswa)");
    setNon("");
    setNonComplet("");
    setEmail("");
    setTel("");
    setNip("");
    load();
  }

  async function toggle(id: string, aktif: boolean) {
    const r = await fetch("/api/admin/kesye", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, aktif }),
    });
    if (!r.ok) return toast.error("Erè");
    load();
  }

  if (forbidden === "login") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-display font-bold">Konekte kòm admin</p>
        <Button asChild className="mt-4" variant="green">
          <Link href="/konekte">Konekte</Link>
        </Button>
      </div>
    );
  }
  if (forbidden === "denied") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p>Aksè refize</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/">Akèy</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-brand-ink">Kèsye boutik</h1>
      <p className="mt-1 text-sm text-black/55">Kreye ajan kèsye ak NIP proviswa 4 chif — premye login sou /recharge ap mande chanje NIP.</p>

      <form onSubmit={create} className="mt-6 grid max-w-md gap-3 rounded-2xl border border-black/5 bg-white p-4">
        <Input placeholder="Non boutik / magazen" value={non} onChange={(e) => setNon(e.target.value)} required />
        <Input placeholder="Non konplè ajan" value={nonComplet} onChange={(e) => setNonComplet(e.target.value)} required />
        <Input placeholder="Imèl ajan" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          placeholder="Telefòn ajan"
          inputMode="tel"
          value={tel}
          onChange={(e) => setTel(e.target.value.replace(/[^\d+]/g, ""))}
        />
        <Input
          placeholder="NIP proviswa (4 chif)"
          inputMode="numeric"
          maxLength={4}
          value={nip}
          onChange={(e) => setNip(e.target.value.replace(/\D/g, "").slice(0, 4))}
          required
        />
        <Button type="submit" variant="green">
          Ajoute yon agent caissier
        </Button>
      </form>

      <div className="mt-8 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-white px-4 py-3 text-sm">
            <div>
              <div className="font-bold">{r.non_boutik}</div>
              <div className="text-xs text-black/55">{r.non_complet || "—"}</div>
              <div className="text-xs text-black/45">{r.email || r.tel || "—"}</div>
              <div className="text-xs text-black/45">{new Date(r.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              {r.nip_temp ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">NIP proviswa</span> : null}
              {r.aktif ? (
                <Button size="sm" variant="outline" type="button" onClick={() => toggle(r.id, false)}>
                  Dezaktive
                </Button>
              ) : (
                <Button size="sm" variant="outline" type="button" onClick={() => toggle(r.id, true)}>
                  Aktive
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-black/45">
        Lyen boutik: <Link className="font-mono text-emerald-700 underline" href="/recharge">/recharge</Link>
      </p>
    </div>
  );
}

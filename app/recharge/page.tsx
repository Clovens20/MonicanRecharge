"use client";

import { useEffect, useState } from "react";
import { RechargeForm } from "@/components/RechargeForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/LanguageToggle";

export default function StoreRechargePage() {
  const [identifiant, setIdentifiant] = useState("");
  const [nip, setNip] = useState("");
  const [mustChangeNip, setMustChangeNip] = useState(false);
  const [newNip, setNewNip] = useState("");
  const [confirmNip, setConfirmNip] = useState("");
  const [logged, setLogged] = useState(false);
  const [boutik, setBoutik] = useState("");

  useEffect(() => {
    void fetch("/api/kesye/me", { credentials: "include" }).then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      if (d.ok) {
        setLogged(true);
        setBoutik(d.non || "");
        setMustChangeNip(Boolean(d.mustChangeNip));
        window.dispatchEvent(new Event("monican-kesye-session"));
      }
    });
  }, []);

  function addDigit(d: string) {
    if (nip.length >= 4) return;
    setNip((n) => n + d);
  }

  function clear() {
    setNip("");
  }

  async function submitNip() {
    if (!identifiant.trim()) return toast.error("Mete imèl oswa telefòn");
    if (nip.length !== 4) return toast.error("Antre 4 chif");
    const r = await fetch("/api/kesye/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifiant, nip }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "NIP pa bon");
    setLogged(Boolean(d.ok));
    setBoutik(d.non || "");
    setMustChangeNip(Boolean(d.requireNipChange));
    setNip("");
    if (d.requireNipChange) {
      toast.message("Premye koneksyon: chwazi nouvo NIP ou");
      return;
    }
    toast.success("Byenveni");
    window.dispatchEvent(new Event("monican-kesye-session"));
  }

  async function saveNewNip() {
    if (newNip.length !== 4 || confirmNip.length !== 4) return toast.error("Antre 4 chif pou nouvo NIP");
    if (newNip !== confirmNip) return toast.error("NIP yo pa menm");
    const r = await fetch("/api/kesye/change-nip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newNip }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Erè");
    setMustChangeNip(false);
    setNewNip("");
    setConfirmNip("");
    toast.success("NIP pèsonèl anrejistre");
    window.dispatchEvent(new Event("monican-kesye-session"));
  }

  async function logoutKesye() {
    await fetch("/api/kesye/logout", { method: "POST", credentials: "include" });
    setLogged(false);
    setBoutik("");
    toast.success("Dekonekte");
    window.dispatchEvent(new Event("monican-kesye-session"));
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <div className="mx-auto flex w-full max-w-2xl justify-end px-4 pt-4">
        <LanguageToggle iconOnly />
      </div>
      <section className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-black tracking-tight text-brand-ink">Recharge — boutik</h1>
        <p className="mt-1 text-sm text-black/55">Kèsye : antre NIP 4 chif pou vann an magazen.</p>

        {!logged ? (
          <div className="mt-8 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <Input
              placeholder="Imèl oswa telefòn"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="mb-4"
            />
            <div className="text-center font-mono text-3xl font-bold tracking-[0.4em] text-brand-ink">{nip.padEnd(4, "·")}</div>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "OK"].map((k) => (
                <Button
                  key={k}
                  type="button"
                  variant={k === "OK" ? "green" : "outline"}
                  className="h-14 text-lg font-bold"
                  onClick={() => {
                    if (k === "C") clear();
                    else if (k === "OK") void submitNip();
                    else addDigit(k);
                  }}
                >
                  {k}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div id="kesye-vente" className="mt-6 space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              <span>{boutik || "Kèsye"}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void logoutKesye()}>
                Soti
              </Button>
            </div>
            {mustChangeNip ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-semibold text-amber-900">Premye koneksyon: kreye NIP pèsonèl ou</div>
                <p className="mt-1 text-xs text-amber-800/90">Apre sa, ou pral konekte sèlman ak nouvo NIP sa a.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Nouvo NIP (4 chif)"
                    inputMode="numeric"
                    maxLength={4}
                    value={newNip}
                    onChange={(e) => setNewNip(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                  <Input
                    placeholder="Konfime NIP"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmNip}
                    onChange={(e) => setConfirmNip(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </div>
                <Button className="mt-3" variant="green" onClick={() => void saveNewNip()}>
                  Sove nouvo NIP
                </Button>
              </div>
            ) : (
              <RechargeForm />
            )}
          </div>
        )}
      </section>
    </main>
  );
}

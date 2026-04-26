"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { addContact, ContactLocal, getContacts, removeContact } from "@/lib/store";
import { detectOperator } from "@/lib/reloadly/mock";
import { Plus, Trash, Phone } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function ContactsPage() {
  const { t } = useLang();
  const [list, setList] = useState<ContactLocal[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("HT");

  useEffect(() => setList(getContacts()), []);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || phone.length < 4) return toast.error("Complete the form");
    const op = detectOperator(phone, country);
    const c: ContactLocal = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      country_code: country,
      flag: country === "HT" ? "🇭🇹" : country === "US" ? "🇺🇸" : "🌍",
      operator: op?.name || "Unknown",
      operator_id: op?.id || 0,
      created_at: new Date().toISOString(),
    };
    addContact(c);
    setList(getContacts());
    setName("");
    setPhone("");
    toast.success("Kontak sove");
  }

  function handleDelete(id: string) {
    removeContact(id);
    setList(getContacts());
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600">— {t("nav.contacts")}</div>
        <h1 className="font-display mt-2 text-4xl font-black tracking-tight sm:text-5xl">{t("contacts.title")}</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <form onSubmit={handleAdd} className="lg:col-span-5 rounded-3xl border border-black/5 bg-white p-6">
            <h3 className="font-display text-lg font-bold tracking-tight">{t("contacts.add")}</h3>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="cname">{t("contacts.name")}</Label>
                <Input data-testid="contact-name" id="cname" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Manman, Papa, Frè..." />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ccountry">{t("form.country")}</Label>
                <select
                  data-testid="contact-country"
                  id="ccountry"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-12 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold focus:border-brand-green focus:outline-none focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="HT">🇭🇹 Haiti</option>
                  <option value="US">🇺🇸 United States</option>
                  <option value="CA">🇨🇦 Canada</option>
                  <option value="DO">🇩🇴 Dominican Republic</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cphone">{t("contacts.phone")}</Label>
                <Input data-testid="contact-phone" id="cphone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="34XX XXXX" />
              </div>
              <Button data-testid="contact-submit" variant="green" size="lg" type="submit">
                <Plus className="h-4 w-4" /> {t("contacts.add")}
              </Button>
            </div>
          </form>

          <div className="lg:col-span-7">
            {list.length === 0 ? (
              <div data-testid="contacts-empty" className="rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center">
                <Phone weight="duotone" className="mx-auto h-12 w-12 text-black/20" />
                <p className="mt-4 font-display text-lg font-bold tracking-tight">{t("dash.empty_contacts")}</p>
                <p className="mt-1 text-sm text-black/50">Add your first saved contact to start fast recharges.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {list.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 transition-all hover:border-emerald-200"
                    data-testid={`contact-${c.id}`}
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-bg text-2xl">{c.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-base font-bold tracking-tight">{c.name}</div>
                      <div className="font-mono text-xs text-black/50">{c.phone} · {c.operator}</div>
                    </div>
                    <Link
                      data-testid={`contact-recharge-${c.id}`}
                      href="/"
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-green px-4 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-emerald-600"
                    >
                      {t("contacts.recharge")}
                    </Link>
                    <button
                      data-testid={`contact-delete-${c.id}`}
                      onClick={() => handleDelete(c.id)}
                      className="grid h-10 w-10 place-items-center rounded-full text-black/40 hover:bg-red-50 hover:text-red-600"
                      aria-label="delete"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

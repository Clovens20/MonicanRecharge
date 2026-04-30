"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "@phosphor-icons/react";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TestimonialReviewForm() {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot.trim()) {
      setStatus("ok");
      return;
    }
    setStatus("sending");
    setErrMsg("");
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("location", location);
      fd.append("rating", String(rating));
      fd.append("message", message);
      fd.append("website", honeypot);
      if (photo) fd.append("photo", photo);

      const r = await fetch("/api/landing/avis", {
        method: "POST",
        body: fd,
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setErrMsg(j.error || t("landing.testi_form_err"));
        setStatus("err");
        return;
      }
      setStatus("ok");
      setName("");
      setLocation("");
      setRating(5);
      setMessage("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setErrMsg(t("landing.testi_form_err"));
      setStatus("err");
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/25 backdrop-blur-xl sm:p-8">
      <h3 className="font-landing-display text-xl font-bold text-white">{t("landing.testi_form_title")}</h3>
      <p className="mt-1 text-sm text-slate-400">{t("landing.testi_form_sub")}</p>

      {status === "ok" ? (
        <div className="mt-6">
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
            {t("landing.testi_form_ok")}
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="mt-3 text-sm font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
          >
            {t("landing.testi_form_again")}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="hidden" aria-hidden>
            <label htmlFor="avis-hp">Website</label>
            <input id="avis-hp" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.testi_form_name")}</label>
            <Input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 border-white/10 bg-black/30 text-white placeholder:text-slate-600"
              placeholder={t("landing.testi_form_name_ph")}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.testi_form_loc")}</label>
            <Input
              maxLength={160}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 border-white/10 bg-black/30 text-white placeholder:text-slate-600"
              placeholder={t("landing.testi_form_loc_ph")}
            />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.testi_form_stars")}</span>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="rounded-lg p-1 transition hover:bg-white/5"
                  aria-label={`${n} stars`}
                >
                  <Star
                    weight={n <= rating ? "fill" : "regular"}
                    className={cn("h-8 w-8", n <= rating ? "text-amber-400" : "text-slate-600")}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.testi_form_msg")}</label>
            <textarea
              required
              minLength={8}
              maxLength={4000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none ring-emerald-500/0 transition placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              placeholder={t("landing.testi_form_msg_ph")}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("landing.testi_form_photo")}</label>
            <p className="mt-0.5 text-[11px] text-slate-500">{t("landing.testi_form_photo_hint")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPhoto(f && f.size > 0 ? f : null);
                }}
              />
              <Button type="button" variant="outline" size="sm" className="border-white/20 text-white" onClick={() => fileRef.current?.click()}>
                {t("landing.testi_form_photo_btn")}
              </Button>
              {photo ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300"
                  onClick={() => {
                    setPhoto(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  {t("landing.testi_form_photo_clear")}
                </button>
              ) : null}
            </div>
            {preview ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="mx-auto max-h-40 w-auto object-contain" />
              </div>
            ) : null}
          </div>
          {status === "err" && errMsg ? (
            <p className="text-sm text-red-300" role="alert">
              {errMsg}
            </p>
          ) : null}
          <Button type="submit" disabled={status === "sending"} variant="green" className="w-full font-bold">
            {status === "sending" ? "…" : t("landing.testi_form_submit")}
          </Button>
        </form>
      )}
    </div>
  );
}

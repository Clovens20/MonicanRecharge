"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RechargeForm } from "@/components/RechargeForm";

function WhatsAppFallback() {
  const href = "https://wa.me/17178801479";
  return (
    <div
      className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-white/[0.06] px-6 py-10 text-center text-slate-200 shadow-lg shadow-black/20 backdrop-blur-xl"
      role="alert"
    >
      <p className="text-base font-medium text-white">Kontakte nou sou WhatsApp: +1 717-880-1479</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
      >
        Ouvrir WhatsApp
      </a>
    </div>
  );
}

class LandingRechargeErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };

  static getDerivedStateFromError() {
    return { err: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[LandingRechargeForm]", error.message, info.componentStack);
  }

  render() {
    if (this.state.err) return <WhatsAppFallback />;
    return this.props.children;
  }
}

/** Formulaire landing sans `dynamic(..., { ssr: false })` (évite skeleton `aria-busy` infini). */
export function LandingRechargeFormSlot() {
  return (
    <LandingRechargeErrorBoundary>
      <RechargeForm visualMode="landing" showReceiptPanel={false} />
    </LandingRechargeErrorBoundary>
  );
}

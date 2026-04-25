import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "green" | "gold" | "red" | "ink";

export const Badge = ({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) => {
  const styles: Record<Variant, string> = {
    neutral: "bg-black/5 text-brand-ink",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
    gold: "bg-amber-50 text-amber-700 border border-amber-200/70",
    red: "bg-red-50 text-red-700 border border-red-200/70",
    ink: "bg-brand-ink text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
        styles[variant],
        className
      )}
      {...props}
    />
  );
};

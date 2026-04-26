"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40",
  {
    variants: {
      variant: {
        default: "bg-brand-ink text-white hover:bg-black hover:-translate-y-0.5 hover:shadow-lg",
        green: "bg-brand-green text-white hover:bg-emerald-600 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(16,185,129,0.35)]",
        gold: "bg-brand-gold text-brand-ink hover:bg-amber-500 hover:-translate-y-0.5",
        outline: "border border-black/10 bg-white text-brand-ink hover:bg-black/5",
        ghost: "text-brand-ink hover:bg-black/5",
        glass: "bg-white/10 text-white border border-white/15 hover:bg-white/15",
        danger: "bg-red-500 text-white hover:bg-red-600",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5",
        lg: "h-14 px-7 text-base",
        xl: "h-16 px-9 text-base",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";
export { buttonVariants };

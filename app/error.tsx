"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error?.digest, error?.message);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-brand-bg px-4 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-600/90">Erè aplikasyon an</p>
      <h1 className="font-display mt-3 max-w-md text-2xl font-black text-brand-ink">Yon bagay pase mal</h1>
      <p className="mt-3 max-w-md text-sm text-black/55">
        Eseye ankò. Si sa kontinye, fèmen onglè a epi ouvri li ankò. (ID: {error.digest || "—"})
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="green" onClick={() => reset()}>
          Eseye ankò
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Retounen lakay</Link>
        </Button>
      </div>
    </main>
  );
}

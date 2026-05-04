import { NextResponse } from "next/server";
import { getGlobalMarkupConfig } from "@/lib/admin/markup-settings";
import { calculateFinalPrice } from "@/lib/markup";

/**
 * Publik : total kliyan dwe peye (markup inclusif). Pa divilje chif Reloadly ni %.
 * GET ?amount=10 → { totalDueUsd: 10 }
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("amount");
  const totalClient = raw == null ? Number.NaN : Number(raw);
  if (!Number.isFinite(totalClient) || totalClient <= 0) {
    return NextResponse.json({ error: "amount invalid" }, { status: 400 });
  }

  const markup = await getGlobalMarkupConfig();
  const r = calculateFinalPrice(totalClient, markup);
  return NextResponse.json({
    totalDueUsd: r.finalPrice,
  });
}

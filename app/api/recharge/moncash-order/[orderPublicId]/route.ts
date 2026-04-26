import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function GET(_req: Request, ctx: { params: { orderPublicId: string } }) {
  const { orderPublicId } = ctx.params;
  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const { data, error } = await svc.from("peman_moncash").select("*").eq("order_public_id", orderPublicId).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Pa jwenn" }, { status: 404 });

  const qr = process.env.NEXT_PUBLIC_MONCASH_QR_IMAGE_URL || "";

  return NextResponse.json({
    orderPublicId: data.order_public_id,
    amountUsd: Number(data.amount_usd),
    htg: Number(data.htg_display),
    moncashNumero: data.moncash_numero,
    estati: data.estati,
    moncashQrUrl: qr,
  });
}

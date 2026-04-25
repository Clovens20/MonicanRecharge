import { NextRequest, NextResponse } from "next/server";
import { detectOperator } from "@/lib/reloadly/mock";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { phone, countryCode } = body || {};
  if (!phone || !countryCode) {
    return NextResponse.json({ error: "Missing phone or countryCode" }, { status: 400 });
  }
  const op = detectOperator(phone, countryCode);
  if (!op) return NextResponse.json({ operator: null });
  return NextResponse.json({ operator: op });
}

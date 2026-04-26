import { NextResponse } from "next/server";
import { detectOperator } from "@/lib/reloadly/mock";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = typeof body.phone === "string" ? body.phone : "";
    const countryCode = typeof body.countryCode === "string" ? body.countryCode : "";
    const operator = detectOperator(phone, countryCode);
    return NextResponse.json({ operator });
  } catch {
    return NextResponse.json({ operator: null }, { status: 400 });
  }
}

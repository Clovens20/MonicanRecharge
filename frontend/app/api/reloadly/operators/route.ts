import { NextResponse } from "next/server";
import { OPERATORS } from "@/lib/reloadly/mock";

export async function GET() {
  return NextResponse.json({ operators: OPERATORS });
}

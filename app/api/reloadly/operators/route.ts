import { NextResponse } from "next/server";
import { OPERATORS } from "@/lib/reloadly/mock";

export function GET() {
  return NextResponse.json({ operators: OPERATORS });
}

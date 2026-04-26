import { NextResponse } from "next/server";

/** Santé de l’API Next.js (équivalent léger de l’ancien FastAPI `/api/`). */
export function GET() {
  return NextResponse.json({ service: "monican-recharge", status: "ok" });
}

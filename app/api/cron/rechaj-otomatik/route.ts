import { NextResponse } from "next/server";
import { processDueAutoRecharges } from "@/lib/rechaj-otomatik/run-due";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await processDueAutoRecharges();
  return NextResponse.json({ ok: true, ...r });
}

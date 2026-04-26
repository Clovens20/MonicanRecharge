import { NextResponse } from "next/server";
import { DATA_PLANS } from "@/lib/reloadly/mock";

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("operatorId");
  if (raw === null || raw === "") {
    return NextResponse.json({ plans: DATA_PLANS });
  }
  const operatorId = parseInt(raw, 10);
  if (Number.isNaN(operatorId)) {
    return NextResponse.json({ plans: [] });
  }
  const plans = DATA_PLANS.filter((p) => p.operatorId === operatorId);
  return NextResponse.json({ plans });
}

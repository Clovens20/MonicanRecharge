import { NextRequest, NextResponse } from "next/server";
import { DATA_PLANS } from "@/lib/reloadly/mock";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operatorId = Number(searchParams.get("operatorId"));
  const plans = isNaN(operatorId) ? DATA_PLANS : DATA_PLANS.filter((p) => p.operatorId === operatorId);
  return NextResponse.json({ plans });
}

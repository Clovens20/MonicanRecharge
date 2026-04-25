import { NextRequest, NextResponse } from "next/server";
import { OPERATORS, DATA_PLANS } from "@/lib/reloadly/mock";
import { uid } from "@/lib/utils";

// MOCKED Reloadly send — when RELOADLY keys are configured, replace with real call.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operatorId, recipientPhone, amount, type, planId, paymentMethod } = body;

    const op = OPERATORS.find((o) => o.id === Number(operatorId));
    if (!op) return NextResponse.json({ success: false, error: "Operator not found" }, { status: 400 });

    if (!recipientPhone?.number || !recipientPhone?.countryCode) {
      return NextResponse.json({ success: false, error: "Missing recipient" }, { status: 400 });
    }

    let finalAmount = Number(amount);
    if (type === "data_plan" && planId) {
      const plan = DATA_PLANS.find((p) => p.id === planId);
      if (!plan) return NextResponse.json({ success: false, error: "Plan not found" }, { status: 400 });
      finalAmount = plan.priceUsd;
    }
    if (!finalAmount || finalAmount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }

    // Simulate Reloadly latency
    await new Promise((r) => setTimeout(r, 700));

    const id = crypto.randomUUID();
    const reference = uid();

    return NextResponse.json({
      success: true,
      id,
      reference,
      operator: op.name,
      recipient: `+${recipientPhone.countryCode === "HT" ? "509" : "1"} ${recipientPhone.number}`,
      amount_usd: finalAmount,
      amount_local: Math.round(finalAmount * op.fxRate),
      currency: op.currency,
      payment_method: paymentMethod,
      status: "siksè",
      created_at: new Date().toISOString(),
      mock: true,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { reference?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON" }, { status: 400 });
  }
  const reference = (body.reference || "").trim();
  if (!reference) return NextResponse.json({ error: "reference" }, { status: 400 });

  const db = await getDb();
  if (!db) return NextResponse.json({ error: "Mongo" }, { status: 503 });

  const r = await db
    .collection("tranzaksyon")
    .updateOne(
      { reference },
      { $set: { refunded: true, refund_at: new Date().toISOString(), refund_by: user.email } }
    );
  if (r.matchedCount === 0) return NextResponse.json({ error: "Pa jwenn" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

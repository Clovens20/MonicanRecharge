import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 200);
  const userEmail = searchParams.get("user_email");

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ transactions: [] });
    }
    const q: Record<string, string> = {};
    if (userEmail) q.user_email = userEmail;
    const rows = await db
      .collection("tranzaksyon")
      .find(q, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ transactions: rows });
  } catch (e) {
    console.warn("Mongo list transactions failed:", e);
    return NextResponse.json({ transactions: [] });
  }
}

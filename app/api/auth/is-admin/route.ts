import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRechargeAdmin } from "@/lib/ajan/admin";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ admin: false });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ admin: false });
  return NextResponse.json({ admin: isRechargeAdmin(user.id, user.email) });
}

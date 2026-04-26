import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureReferralKod } from "@/lib/referal/customer";

export async function POST() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kod = await ensureReferralKod(user.id);
  if (!kod) return NextResponse.json({ error: "Pa ka kreye kòd" }, { status: 500 });
  return NextResponse.json({ kod });
}

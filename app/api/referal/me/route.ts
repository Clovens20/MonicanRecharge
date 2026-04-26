import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureReferralKod } from "@/lib/referal/customer";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row } = await sb.from("referal_kod").select("kod").eq("user_id", user.id).maybeSingle();
  let kod = row?.kod as string | undefined;
  if (!kod) kod = (await ensureReferralKod(user.id)) || undefined;

  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const shareUrl = kod && base ? `${base}/?cref=${encodeURIComponent(kod)}` : "";

  const { data: kr } = await sb.from("referal_kredi").select("balans_usd").eq("user_id", user.id).maybeSingle();
  const kredi = Number(kr?.balans_usd || 0);

  return NextResponse.json({ kod: kod || null, shareUrl, krediBalans: kredi });
}

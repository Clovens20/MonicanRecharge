import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRechargeAdmin } from "@/lib/ajan/admin";

/** Un sèl apèl pou Navbar : mwens latans pase is-admin + ajan/me an seri. */
export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ admin: false, agent: false, authed: false });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ admin: false, agent: false, authed: false });
  }

  const admin = Boolean(user.email && isRechargeAdmin(user.id, user.email));
  const { data: agentRow } = await sb.from("ajan").select("user_id").eq("user_id", user.id).maybeSingle();

  return NextResponse.json({
    authed: true,
    admin,
    agent: Boolean(agentRow),
  });
}

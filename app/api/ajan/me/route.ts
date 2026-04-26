import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ agent: null, configured: false });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ agent: null, user: null }, { status: 401 });
  }

  const { data: agent, error } = await sb.from("ajan").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    agent: agent || null,
    user: { id: user.id, email: user.email },
  });
}

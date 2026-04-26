import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.email || !isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service role" }, { status: 503 });

  const { data, error } = await svc
    .from("aplasyon_ajan")
    .select("*")
    .eq("estati", "annatant")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data || [] });
}

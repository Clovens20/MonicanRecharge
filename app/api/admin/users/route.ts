import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";

export async function GET(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service role" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = Math.min(parseInt(searchParams.get("perPage") || "50", 10), 100);

  const { data, error } = await svc.auth.admin.listUsers({ page, perPage });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users =
    data.users?.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      role: (u.app_metadata as { role?: string })?.role || (u.user_metadata as { role?: string })?.role || "kliyan",
      banned: u.banned_until ? true : false,
    })) || [];

  return NextResponse.json({ users });
}

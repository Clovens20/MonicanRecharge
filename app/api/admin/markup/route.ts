import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { isRechargeAdmin } from "@/lib/ajan/admin";
import { getGlobalMarkupConfig, setGlobalMarkupConfig } from "@/lib/admin/markup-settings";
import type { MarkupConfig } from "@/lib/markup";
import { normalizeMarkupConfig } from "@/lib/markup";

export async function GET() {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await getGlobalMarkupConfig();
  return NextResponse.json({
    enabled: cfg.enabled,
    percentage: cfg.percentage,
    minFlatFee: cfg.minFlatFee,
  });
}

type PostBody = {
  enabled?: boolean;
  percentage?: number;
  minFlatFee?: number;
};

export async function POST(req: Request) {
  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isRechargeAdmin(user.id, user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service" }, { status: 503 });

  const next: MarkupConfig = normalizeMarkupConfig({
    enabled: body.enabled,
    percentage: body.percentage,
    minFlatFee: body.minFlatFee,
  });
  if (next.percentage > 25) {
    return NextResponse.json({ error: "Markup % max 25" }, { status: 400 });
  }
  if (next.minFlatFee > 10) {
    return NextResponse.json({ error: "Frais min. max $10" }, { status: 400 });
  }

  const res = await setGlobalMarkupConfig(svc, next);
  if (res.ok === false) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, config: next });
}

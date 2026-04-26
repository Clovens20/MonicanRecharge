import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

type Body = { detay?: string; montant?: number };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }

  const detay = (body.detay || "").trim();
  const montant = typeof body.montant === "number" ? body.montant : NaN;
  if (!detay || !Number.isFinite(montant) || montant <= 0) {
    return NextResponse.json({ error: "Montant ak detay obligatwa" }, { status: 400 });
  }

  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: agent } = await sb.from("ajan").select("balans_komisyon").eq("user_id", user.id).maybeSingle();
  if (!agent) return NextResponse.json({ error: "Pa ajan" }, { status: 403 });

  if (montant > Number(agent.balans_komisyon || 0) + 0.0001) {
    return NextResponse.json({ error: "Montant pi gwo pase balans" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service role manke" }, { status: 503 });

  const { error } = await svc.from("demann_peman_ajan").insert({
    ajan_id: user.id,
    montant,
    detay,
    estati: "annatant",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

type Body = { sijè?: string; mesaj?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 400 });
  }

  const sijè = (body.sijè || "").trim().slice(0, 140);
  const mesaj = (body.mesaj || "").trim().slice(0, 4000);
  if (sijè.length < 3 || mesaj.length < 8) {
    return NextResponse.json({ error: "Sijè ak mesaj obligatwa" }, { status: 400 });
  }

  const sb = createClient();
  if (!sb) return NextResponse.json({ error: "Supabase" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ag } = await sb.from("ajan").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!ag) return NextResponse.json({ error: "Pa ajan" }, { status: 403 });

  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Service role manke" }, { status: 503 });

  const { error } = await svc.from("demann_ed_ajan").insert({
    ajan_id: user.id,
    sijè,
    mesaj,
    estati: "ouvè",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/security/rate-limit";

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFromMime(m: string) {
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return "jpg";
}

type AvisRow = { non: string; kote: string | null; rating: number; mesaj: string; foto_path?: string };

async function insertReview(svc: SupabaseClient, row: AvisRow) {
  return svc.from("avis_landing").insert(row);
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
  const rl = checkRateLimit(`landing-avis:${ip}`, 8, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: `Twòp demand. Rè eseye nan ${rl.retryAfterSec}s.` }, { status: 429 });
  }

  const svc = getServiceSupabase();
  if (!svc) {
    return NextResponse.json(
      { error: "Sèvis avis pa disponib (konfigire Supabase nan sèvè a)." },
      { status: 503 },
    );
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Itilize FormData (fòm avis la)." }, { status: 415 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData envalid" }, { status: 400 });
  }

  if (String(form.get("website") || "").trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = String(form.get("name") || "").trim().slice(0, 120);
  const location = String(form.get("location") || "").trim().slice(0, 160) || null;
  const message = String(form.get("message") || "").trim().slice(0, 4000);
  const rating = Math.round(Number(form.get("rating")));

  if (name.length < 2) return NextResponse.json({ error: "Non twò kout" }, { status: 400 });
  if (message.length < 8) return NextResponse.json({ error: "Mesaj la two kout" }, { status: 400 });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating 1–5 obligatwa" }, { status: 400 });
  }

  let foto_path: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Foto: JPEG, PNG oswa WebP sèlman" }, { status: 400 });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Foto two gwo (max ~1.5 Mo)" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const id = `${Date.now()}-${randomBytes(6).toString("hex")}.${extFromMime(file.type)}`;
    const path = `reviews/${id}`;
    const { error: upErr } = await svc.storage.from("avis_landing_photos").upload(path, buf, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      console.warn("avis_landing_photos upload:", upErr.message);
      return NextResponse.json({ error: "Upload foto echwe (verifye bucket Supabase)." }, { status: 502 });
    }
    foto_path = path;
  }

  const base = { non: name, kote: location, rating, mesaj: message };
  const { error } = await insertReview(svc, foto_path ? { ...base, foto_path } : base);
  if (error) {
    if (foto_path) await svc.storage.from("avis_landing_photos").remove([foto_path]).catch(() => {});
    console.warn("avis_landing insert:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

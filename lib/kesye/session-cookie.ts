import { createHmac, timingSafeEqual } from "crypto";

export const KESYE_SESSION_COOKIE_NAME = "monican_kesye";
const TTL_MS = 12 * 60 * 60 * 1000;
const TEMP_TTL_MS = 20 * 60 * 1000;
type KesyeMode = "full" | "temp";

function secret() {
  return process.env.KESYE_SESSION_SECRET || process.env.CRON_SECRET || "dev-kesye-secret-change";
}

export function signKesyeSession(kesyeId: string, mode: KesyeMode = "full"): string {
  const exp = Date.now() + (mode === "temp" ? TEMP_TTL_MS : TTL_MS);
  const payload = `${kesyeId}|${exp}|${mode === "temp" ? "t" : "f"}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyKesyeSessionInfo(token: string | undefined | null): { id: string; mode: KesyeMode } | null {
  if (!token || typeof token !== "string") return null;
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return null;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const parts = payload.split("|");
  if (parts.length < 2) return null;
  const kesyeId = parts[0];
  const expStr = parts[1];
  const modeRaw = parts[2] || "f";
  const mode: KesyeMode = modeRaw === "t" ? "temp" : "full";
  const exp = Number(expStr);
  if (!kesyeId || !Number.isFinite(exp) || Date.now() > exp) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig, "utf8");
  if (a.length !== b.length) return null;
  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { id: kesyeId, mode };
}

export function verifyKesyeSession(token: string | undefined | null): string | null {
  const info = verifyKesyeSessionInfo(token);
  return info?.id || null;
}

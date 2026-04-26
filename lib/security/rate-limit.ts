/** Limit in-memory (yon sèl enstans Node). Pou pwodiksyon multi-enstans, itilize Upstash oswa Redis. */

type Bucket = { at: number[] };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

export function pruneBucket(now: number, at: number[], windowMs: number = WINDOW_MS) {
  return at.filter((t) => now - t < windowMs);
}

export function checkRateLimit(
  key: string,
  max: number = MAX_PER_WINDOW,
  windowMs: number = WINDOW_MS
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key) || { at: [] };
  b.at = pruneBucket(now, b.at, windowMs);
  if (b.at.length >= max) {
    const oldest = b.at[0] || now;
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  b.at.push(now);
  buckets.set(key, b);
  return { ok: true };
}

import { createHash } from "crypto";

export function normalizeKesyeNip(pin: string): string {
  return pin.replace(/\D/g, "").slice(0, 4);
}

/** Hash determinis pou chèche rapidman (pepper nan .env). */
export function hashKesyeNip(pin: string): string {
  const pepper = process.env.KESYE_PEPPER || "monican-kesye-pepper-change";
  const normalized = normalizeKesyeNip(pin);
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

export function isValidFourDigitNip(pin: string): boolean {
  return normalizeKesyeNip(pin).length === 4;
}

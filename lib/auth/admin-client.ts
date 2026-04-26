/** Pou redireksyon kote kliyan (NEXT_PUBLIC_ADMIN_EMAILS = menm lis ke ADMIN_EMAILS). */
export function isAdminEmailClient(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const set = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return set.includes(email.trim().toLowerCase());
}

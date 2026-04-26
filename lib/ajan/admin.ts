/** Liste d’imèl admin (séparées par virgule) — même logique que les API /api/admin/*. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || "";
  const set = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return set.includes(email.trim().toLowerCase());
}

const FIXED_RECHARGE_ADMIN_IDS = ["f744343f-d62f-4a97-8b7a-472637efd8ec"];

/** Admin Recharge dédié (séparé du reste du projet Supabase partagé). */
export function isRechargeAdmin(userId: string | null | undefined, email?: string | null | undefined): boolean {
  const envIds = (process.env.RECHARGE_ADMIN_USER_IDS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const ids = new Set([...FIXED_RECHARGE_ADMIN_IDS, ...envIds]);
  if (userId && ids.has(userId)) return true;
  return isAdminEmail(email);
}

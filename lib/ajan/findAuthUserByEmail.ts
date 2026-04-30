import type { SupabaseClient } from "@supabase/supabase-js";

const PER_PAGE = 1000;
const MAX_PAGES = 50;

/** Retrouve l’id Auth Supabase pour un imèl (pagination listUsers). */
export async function findAuthUserIdByEmail(svc: SupabaseClient, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await svc.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === normalized);
    if (u) return u.id;
    if (data.users.length < PER_PAGE) return null;
  }
  return null;
}

export function isInviteEmailAlreadyRegisteredError(err: { message?: string; status?: number }): boolean {
  const m = (err.message || "").toLowerCase();
  if (err.status === 422) return true;
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already registered") ||
    m.includes("email address is already")
  );
}

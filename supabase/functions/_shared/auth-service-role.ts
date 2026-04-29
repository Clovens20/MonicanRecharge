/** Vérifie Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (appels internes uniquement). */
export function assertServiceRole(req: Request): Response | null {
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`.trim();
  const got = (req.headers.get("Authorization") ?? "").trim();
  if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || got !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

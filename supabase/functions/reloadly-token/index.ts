import { assertServiceRole } from "../_shared/auth-service-role.ts";
import { corsOptions, jsonResponse } from "../_shared/cors.ts";
import { getReloadlyToken, isReloadlySandbox } from "../_shared/reloadly-token.ts";

/**
 * Retourne un access_token Reloadly (réservé aux appels internes avec la service role).
 * Ne jamais exposer cette URL au navigateur sans cette protection.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const denied = assertServiceRole(req);
  if (denied) return denied;

  try {
    const token = await getReloadlyToken();
    return jsonResponse({ token, sandbox: isReloadlySandbox() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});

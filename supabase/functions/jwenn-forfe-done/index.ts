import { corsOptions, jsonResponse } from "../_shared/cors.ts";
import { getReloadlyBaseUrl, getReloadlyToken } from "../_shared/reloadly-token.ts";

/**
 * POST { operatorId } — forfaits data Reloadly pour un opérateur.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const body = (await req.json()) as { operatorId?: number | string };
    const operatorId = body.operatorId;
    if (operatorId == null || operatorId === "") {
      return jsonResponse({ error: "operatorId requis" }, 400);
    }

    const token = await getReloadlyToken();
    const base = getReloadlyBaseUrl();
    const res = await fetch(`${base}/operators/${operatorId}/data-bundles`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/com.reloadly.topups-v1+json",
      },
    });

    if (!res.ok) {
      return jsonResponse({ plans: [], note: await res.text() }, 200);
    }

    const data = (await res.json()) as { content?: unknown[] } | unknown[];
    const plans = Array.isArray(data) ? data : (Array.isArray(data.content) ? data.content : []);

    const formattedPlans = plans.slice(0, 50).map((plan: Record<string, unknown>) => ({
      id: plan.id,
      title: plan.title ?? plan.description,
      data: plan.dataSize ?? plan.data ?? "N/A",
      validity: plan.validity ?? plan.validityPeriod,
      price: plan.price,
      localPrice: plan.localPrice,
      description: plan.description,
    }));

    return jsonResponse({ plans: formattedPlans });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg, plans: [] }, 500);
  }
});

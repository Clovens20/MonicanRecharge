export const corsJsonHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

export function corsOptions(): Response {
  return new Response("ok", {
    headers: {
      ...corsJsonHeaders,
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    },
  });
}

export function jsonResponse(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsJsonHeaders, "Content-Type": "application/json", ...extra },
  });
}

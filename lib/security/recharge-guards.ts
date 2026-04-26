import { getDb } from "@/lib/mongodb";
import { getServiceSupabase } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import type { RechargeBody } from "@/lib/recharge/executeSend";

function startOfDayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function normalizePhone(body: RechargeBody): string | null {
  const cc = body.recipientPhone?.countryCode;
  const num = body.recipientPhone?.number?.replace(/\D/g, "") || "";
  if (!cc || !num) return null;
  return `${cc}:${num}`;
}

export async function logSecurityAlert(tip: string, detay: Record<string, unknown>, userId: string | null) {
  const svc = getServiceSupabase();
  if (!svc) return;
  try {
    await svc.from("sekirize_alèt").insert({ tip, detaj: detay, user_id: userId });
  } catch (e) {
    console.warn("sekirize_alèt insert", e);
  }
}

export async function assertRechargeAllowed(params: {
  body: RechargeBody;
  finalAmountUsd: number;
  userId: string | null;
  userEmail: string | null;
  clientIp: string;
  channel: "online" | "caisse" | "ajan" | "moncash_manual";
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const maxTx = parseFloat(process.env.RECHARGE_MAX_USD || "100");
  if (params.finalAmountUsd > maxTx) {
    return { ok: false, error: `Montan max pa tranzaksyon: $${maxTx}`, status: 400 };
  }

  const maxDayUser = parseFloat(process.env.RECHARGE_MAX_DAY_USER_USD || "200");
  const maxDayCaisse = parseFloat(process.env.RECHARGE_MAX_DAY_CAISSE_USD || "500");

  const db = await getDb();
  const since = startOfDayIso();
  const email = (params.userEmail || "").trim().toLowerCase();

  if (db && email) {
    const dayAgg = await db
      .collection("tranzaksyon")
      .aggregate([
        { $match: { user_email: email, created_at: { $gte: since }, status: "siksè" } },
        { $group: { _id: null, s: { $sum: "$amount_usd" } } },
      ])
      .toArray();
    const spent = Number((dayAgg[0] as { s?: number } | undefined)?.s || 0);
    if (spent + params.finalAmountUsd > maxDayUser) {
      await logSecurityAlert("limite_jounen_itilizatè", { email, spent, add: params.finalAmountUsd }, params.userId);
      return { ok: false, error: `Limite jounen ($${maxDayUser}) depase.`, status: 429 };
    }
  }

  if (params.channel === "caisse" && db && email) {
    const dayCaisse = await db
      .collection("tranzaksyon")
      .aggregate([
        {
          $match: {
            channel: "caisse",
            user_email: email,
            created_at: { $gte: since },
            status: "siksè",
          },
        },
        { $group: { _id: null, s: { $sum: "$amount_usd" } } },
      ])
      .toArray();
    const spentC = Number((dayCaisse[0] as { s?: number } | undefined)?.s || 0);
    if (spentC + params.finalAmountUsd > maxDayCaisse) {
      await logSecurityAlert("limite_jounen_kès", { spentC, add: params.finalAmountUsd, email }, params.userId);
      return { ok: false, error: `Limite jounen kès ($${maxDayCaisse}) depase.`, status: 429 };
    }
  }

  const phone = normalizePhone(params.body);
  if (db && phone && params.body.recipientPhone?.number) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const tail = params.body.recipientPhone.number.replace(/\D/g, "").slice(-8);
    const n = await db.collection("tranzaksyon").countDocuments({
      recipient: { $regex: tail, $options: "i" },
      created_at: { $gte: hourAgo },
      status: "siksè",
    });
    if (n >= 5) {
      await logSecurityAlert("telefòn_repete", { phone, count: n, ip: params.clientIp }, params.userId);
      if (process.env.AUTO_SUSPEND_FRAUD === "true" && params.userId) {
        const svc = getServiceSupabase();
        if (svc) {
          await svc.auth.admin.updateUserById(params.userId, { ban_duration: "24h" }).catch(() => {});
        }
      }
      if (process.env.BLOCK_PHONE_SPAM === "true") {
        return { ok: false, error: "Aktivite sispèk sou nimewo sa a.", status: 429 };
      }
    }
  }

  const rateKey = params.userId || params.userEmail || params.clientIp;
  const rl = checkRateLimit(`recharge:${rateKey}`);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Twòp demand. Rè eseye nan ${rl.retryAfterSec}s.`,
      status: 429,
    };
  }

  return { ok: true };
}

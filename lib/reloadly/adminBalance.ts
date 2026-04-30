import { fetchReloadlyWalletBalance, getReloadlyCredentials } from "@/lib/reloadly/auth";

/** Solde affiché admin : API Reloadly si identifiants présents, sinon `RELOADLY_BALANCE_USD` (.env). */
export async function getReloadlyBalanceUsdForAdmin(): Promise<{
  balanceUsd: number;
  source: "live" | "env";
  liveError?: string;
}> {
  const envFallback = parseFloat(process.env.RELOADLY_BALANCE_USD || "0");
  if (!getReloadlyCredentials()) {
    return { balanceUsd: envFallback, source: "env" };
  }
  try {
    const w = await fetchReloadlyWalletBalance();
    return { balanceUsd: Number(w.balance) || 0, source: "live" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { balanceUsd: envFallback, source: "env", liveError: msg };
  }
}

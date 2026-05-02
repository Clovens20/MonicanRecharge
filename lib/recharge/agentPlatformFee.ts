/** Pousantaj frè platfòm sou lavant ajan (revandè) — default 5%. */
export function getAgentPlatformFeePct(): number {
  const raw =
    process.env.AGENT_PLATFORM_FEE_PCT ?? process.env.NEXT_PUBLIC_AGENT_PLATFORM_FEE_PCT ?? "5";
  const n = parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return 5;
  return Math.min(n, 100);
}

/** Frè USD sou `prixVann` (pri kliyan), arondi 2 desimal — itilize sèlman pou kanal ajan. */
export function computeAgentPlatformFeeUsd(prixVannUsd: number): number {
  if (!Number.isFinite(prixVannUsd) || prixVannUsd <= 0) return 0;
  const pct = getAgentPlatformFeePct() / 100;
  return Math.round(prixVannUsd * pct * 100) / 100;
}

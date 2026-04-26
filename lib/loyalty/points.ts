/** $1 = 10 pwen ; 100 pwen = $0.50 rebay */

export function pointsFromUsd(amountUsd: number): number {
  return Math.floor(Math.max(0, amountUsd) * 10);
}

export function rebateUsdFromPoints(pwenTotal: number, pwenItilize: number): number {
  const dispo = Math.max(0, pwenTotal - pwenItilize);
  return Math.floor(dispo / 100) * 0.5;
}

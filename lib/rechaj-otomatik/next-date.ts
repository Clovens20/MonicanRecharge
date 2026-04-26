export function nextPwochenDateIso(fromYmd: string, frekans: string): string {
  const d = new Date(fromYmd + "T12:00:00.000Z");
  if (frekans === "chak_semèn") d.setUTCDate(d.getUTCDate() + 7);
  else if (frekans === "chak_2semèn") d.setUTCDate(d.getUTCDate() + 14);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

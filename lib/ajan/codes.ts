const PREFIX = "MON-AG-";

/** Génère un kòd_ajan unique (MON-AG-XXX) côté serveur. */
export async function generateUniqueAgentCode(
  exists: (code: string) => Promise<boolean>
): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const n = Math.floor(100 + Math.random() * 900);
    const code = `${PREFIX}${n}`;
    if (!(await exists(code))) return code;
  }
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${PREFIX}${suffix}`;
}

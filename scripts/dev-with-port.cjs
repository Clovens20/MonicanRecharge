/**
 * Lance `next dev` sur le premier port libre entre MIN et MAX (évite EADDRINUSE).
 */
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const MIN = parseInt(process.env.DEV_PORT_MIN || "3100", 10);
const MAX = parseInt(process.env.DEV_PORT_MAX || "3999", 10);

/**
 * Vérifie que le port est libre en écoutant comme Next (`::`, dual-stack),
 * pas seulement sur `0.0.0.0` (sinon faux positif sous Windows).
 */
function tryListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(null));
    server.once("listening", () => {
      server.close(() => resolve(port));
    });
    try {
      server.listen({ port, host: "::", ipv6Only: false });
    } catch {
      server.removeAllListeners();
      server.once("error", () => resolve(null));
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      try {
        server.listen(port, "0.0.0.0");
      } catch {
        resolve(null);
      }
    }
  });
}

async function findFreePort() {
  for (let p = MIN; p <= MAX; p++) {
    const ok = await tryListen(p);
    if (ok !== null) return ok;
  }
  throw new Error(
    `Aucun port libre entre ${MIN} et ${MAX}. Ferme les autres \`next dev\` ou élève DEV_PORT_MAX.`
  );
}

(async () => {
  const port = await findFreePort();
  const root = path.join(__dirname, "..");
  const nextCli = require.resolve("next/dist/bin/next");

  console.log(
    `\n\x1b[32m[monican-recharge]\x1b[0m Port \x1b[1m${port}\x1b[0m → http://localhost:${port}\n` +
      `OAuth / callbacks : aligne \x1b[1mNEXT_PUBLIC_APP_URL\x1b[0m sur cette URL si besoin.\n`
  );

  const child = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, PORT: String(port) },
  });

  child.on("exit", (code) => process.exit(code ?? 0));
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

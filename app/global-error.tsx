"use client";

/**
 * Erè grav nan layout rasin — dwe gen <html> / <body> (Next.js App Router).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ht">
      <body style={{ margin: 0, fontFamily: "system-ui,sans-serif", background: "#f4f6f8", color: "#111" }}>
        <div style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800 }}>Monican — erè grav</h1>
          <p style={{ marginTop: 12, fontSize: 14, opacity: 0.75 }}>
            Rechaje paj la oswa tounen pita. {error.digest ? `(${error.digest})` : ""}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: "#00a854",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Eseye ankò
          </button>
        </div>
      </body>
    </html>
  );
}

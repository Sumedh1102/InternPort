"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#faf6ec", color: "#0b0b0c", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0 }}>
        <div role="alert" style={{ border: "2px solid #0b0b0c", borderRadius: 24, background: "#fffdf7", padding: 32, maxWidth: 420, textAlign: "center", boxShadow: "6px 6px 0 #0b0b0c" }}>
          <h1 style={{ margin: 0 }}>Something went wrong</h1>
          <p>Please try again in a moment.</p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12 }}>Ref: {error.digest}</p>}
          <button
            onClick={reset}
            style={{ border: "2px solid #0b0b0c", borderRadius: 999, background: "#c6ff34", padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

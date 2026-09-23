"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleKey(k: string) {
    if (loading) return;
    if (k === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError("");
      return;
    }
    if (!k) return;
    const next = pin + k;
    setPin(next);
    setError("");

    if (next.length === 4) {
      setLoading(true);
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: next }),
      });
      if (res.ok) {
        router.replace("/dashboard");
      } else {
        setError("PIN incorrecto");
        setPin("");
        setLoading(false);
      }
    }
  }

  return (
    <div style={{
      minHeight: "100svh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 32px",
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, margin: "0 auto 16px",
        }}>
          💰
        </div>
        <h1 style={{ color: "var(--text)", fontSize: 22, fontWeight: 800, margin: 0 }}>
          Wealth Tracker
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>
          Ingresa tu PIN de acceso
        </p>
      </div>

      {/* PIN dots */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: i < pin.length
              ? (error ? "var(--red)" : "var(--blue)")
              : "var(--surf2)",
            border: `2px solid ${i < pin.length ? (error ? "var(--red)" : "var(--blue)") : "var(--border)"}`,
            transition: "all 0.15s",
          }} />
        ))}
      </div>

      {/* Error */}
      <p style={{
        color: "var(--red)", fontSize: 13, fontWeight: 600,
        minHeight: 20, marginBottom: 28,
        opacity: error ? 1 : 0, transition: "opacity 0.2s",
      }}>
        {error || " "}
      </p>

      {/* Numpad */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14, width: "100%", maxWidth: 280,
      }}>
        {KEYS.map((k, i) => (
          <button
            key={i}
            onPointerDown={(e) => { e.preventDefault(); handleKey(k); }}
            disabled={!k || loading}
            style={{
              height: 68, fontSize: k === "⌫" ? 22 : 26,
              fontWeight: k === "⌫" ? 400 : 700,
              background: k ? "var(--surf)" : "transparent",
              border: k ? "1px solid var(--border)" : "none",
              borderRadius: 18,
              color: k ? "var(--text)" : "transparent",
              cursor: k ? "pointer" : "default",
              opacity: loading ? 0.5 : 1,
              fontFamily: k !== "⌫" ? "var(--font-mono)" : "inherit",
              transition: "background 0.1s",
            }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

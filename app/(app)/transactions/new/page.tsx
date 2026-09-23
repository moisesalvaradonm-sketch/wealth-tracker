"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TX_TYPES = [
  { value: "INCOME",   label: "Gané",     emoji: "💰", color: "#3fb950", bg: "rgba(63,185,80,0.15)" },
  { value: "EXPENSE",  label: "Gasté",    emoji: "💸", color: "#f85149", bg: "rgba(248,81,73,0.15)" },
  { value: "TRANSFER", label: "Moví",     emoji: "↔️", color: "#58a6ff", bg: "rgba(88,166,255,0.15)" },
  { value: "INVESTMENT", label: "Invertí", emoji: "📈", color: "#bc8cff", bg: "rgba(188,140,255,0.15)" },
];

const CATEGORIES: Record<string, string[]> = {
  INCOME:     ["Salario", "Comisión", "Freelance", "Regalo", "Reembolso", "Otro"],
  EXPENSE:    ["Comida", "Transporte", "Entretenimiento", "Ropa", "Salud", "Servicios", "Suscripciones", "Otro"],
  TRANSFER:   ["Entre cuentas", "Retiro", "Depósito"],
  INVESTMENT: ["Acciones", "Cripto", "Fondo", "Inmueble", "Otro"],
};

interface Account { id: string; name: string; accountType: string; }

export default function NewTransactionPage() {
  const router = useRouter();
  const [txType, setTxType] = useState("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      setAccounts(data);
      if (data.length > 0) setAccountId(data[0].id);
    });
  }, []);

  const current = TX_TYPES.find((t) => t.value === txType)!;

  function handleDigit(d: string) {
    if (d === "." && amount.includes(".")) return;
    if (d === "." && amount === "") { setAmount("0."); return; }
    const next = amount + d;
    const [int, dec] = next.split(".");
    if (dec && dec.length > 2) return;
    if (int.replace(/^0+/, "").length > 9) return;
    setAmount(next.replace(/^0+(\d)/, "$1"));
  }

  function handleBackspace() {
    setAmount((a) => a.slice(0, -1));
  }

  async function handleSave() {
    if (!amount || parseFloat(amount) === 0) { setError("Ingresa un monto"); return; }
    if (!accountId) { setError("Selecciona una cuenta"); return; }
    if (!description.trim()) { setError("Agrega una descripción"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txType, amount, accountId, description, date, categoryName }),
    });
    if (res.ok) {
      router.push("/transactions");
    } else {
      const d = await res.json();
      setError(d.error || "Error al guardar");
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--border)",
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}
        >
          ←
        </button>
        <h2 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0 }}>Nueva transacción</h2>
      </div>

      {/* Type selector */}
      <div style={{ display: "flex", gap: 8, padding: "16px 20px 0" }}>
        {TX_TYPES.map((t) => (
          <button
            key={t.value}
            onPointerDown={(e) => { e.preventDefault(); setTxType(t.value); setCategoryName(""); }}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "10px 4px", borderRadius: 14, cursor: "pointer",
              border: txType === t.value ? `2px solid ${t.color}` : "1px solid var(--border)",
              background: txType === t.value ? t.bg : "var(--surf)",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 18 }}>{t.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: txType === t.value ? t.color : "var(--muted)" }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Amount display */}
      <div style={{
        padding: "28px 24px 16px",
        textAlign: "center",
      }}>
        <p style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600, margin: "0 0 8px", letterSpacing: 1 }}>
          MONTO (USD)
        </p>
        <div style={{
          fontSize: amount ? (amount.length > 8 ? 36 : 52) : 52,
          fontWeight: 800, letterSpacing: "-2px",
          color: amount ? current.color : "var(--surf2)",
          fontFamily: "var(--font-mono)",
          minHeight: 68, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "font-size 0.1s",
        }}>
          ${amount || "0"}
        </div>
      </div>

      {/* Numpad */}
      <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map((k) => (
          <button
            key={k}
            onPointerDown={(e) => { e.preventDefault(); k === "⌫" ? handleBackspace() : handleDigit(k); }}
            style={{
              padding: "18px 0", fontSize: k === "⌫" ? 20 : 24,
              fontWeight: k === "⌫" ? 400 : 700,
              background: "var(--surf)", border: "1px solid var(--border)",
              borderRadius: 16, color: "var(--text)", cursor: "pointer",
              fontFamily: k !== "⌫" ? "var(--font-mono)" : "inherit",
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>

        {/* Description */}
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="¿En qué? (ej: Starbucks, nómina…)"
          style={{
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "13px 16px",
            color: "var(--text)", fontSize: 15, outline: "none", width: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* Account */}
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          style={{
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "13px 16px",
            color: accountId ? "var(--text)" : "var(--muted)",
            fontSize: 15, outline: "none", width: "100%",
            boxSizing: "border-box", appearance: "none",
          }}
        >
          <option value="" disabled>Selecciona una cuenta</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {accounts.length === 0 && (
          <a
            href="/accounts"
            style={{
              display: "block", textAlign: "center", padding: "12px",
              background: "rgba(88,166,255,0.1)", borderRadius: 12,
              color: "var(--blue)", fontSize: 13, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Primero crea una cuenta →
          </a>
        )}

        {/* Category */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(CATEGORIES[txType] || []).map((cat) => (
            <button
              key={cat}
              onPointerDown={(e) => { e.preventDefault(); setCategoryName(cat === categoryName ? "" : cat); }}
              style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                background: categoryName === cat ? current.bg : "var(--surf)",
                border: categoryName === cat ? `1.5px solid ${current.color}` : "1px solid var(--border)",
                color: categoryName === cat ? current.color : "var(--muted)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Date */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "13px 16px",
            color: "var(--text)", fontSize: 15, outline: "none",
            width: "100%", boxSizing: "border-box",
            colorScheme: "dark",
          }}
        />

        {error && (
          <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center", margin: 0 }}>{error}</p>
        )}

        {/* Save */}
        <button
          onPointerDown={(e) => { e.preventDefault(); handleSave(); }}
          disabled={saving}
          style={{
            width: "100%", padding: "15px 0",
            background: `linear-gradient(135deg, ${current.color}, ${current.color}cc)`,
            color: "#fff", border: "none", borderRadius: 16,
            fontSize: 16, fontWeight: 800, cursor: "pointer",
            opacity: saving ? 0.7 : 1, marginTop: 4,
          }}
        >
          {saving ? "Guardando…" : `Registrar — $${amount || "0"}`}
        </button>
      </div>
    </div>
  );
}

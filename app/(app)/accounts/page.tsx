"use client";

import { useEffect, useState } from "react";

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Cuenta corriente", icon: "🏦" },
  { value: "SAVINGS", label: "Ahorros", icon: "🏧" },
  { value: "CASH", label: "Efectivo", icon: "💵" },
  { value: "CREDIT", label: "Tarjeta de crédito", icon: "💳" },
  { value: "CRYPTO_WALLET", label: "Cripto wallet", icon: "₿" },
  { value: "BROKERAGE", label: "Broker / inversiones", icon: "📈" },
  { value: "OTHER", label: "Otro", icon: "📁" },
];

const COLORS = ["#58a6ff", "#3fb950", "#f85149", "#e6b34d", "#bc8cff", "#79c0ff", "#56d364"];

interface Account {
  id: string;
  name: string;
  accountType: string;
  color?: string;
  icon?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    accountType: "CHECKING",
    color: COLORS[0],
    notes: "",
  });

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => { setAccounts(data); setLoading(false); });
  }, []);

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const acc = await res.json();
      setAccounts((prev) => [...prev, acc]);
      setShowForm(false);
      setForm({ name: "", accountType: "CHECKING", color: COLORS[0], notes: "" });
    }
    setSaving(false);
  }

  const typeInfo = (type: string) => ACCOUNT_TYPES.find((t) => t.value === type);

  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800, margin: 0 }}>Mis cuentas</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "2px 0 0" }}>Todo tu dinero en un solo lugar</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          + Agregar
        </button>
      </div>

      {loading && (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center" }}>Cargando…</p>
      )}

      {!loading && accounts.length === 0 && !showForm && (
        <div style={{
          background: "var(--surf)", border: "1px solid var(--border)",
          borderRadius: 20, padding: "32px 20px", textAlign: "center",
        }}>
          <p style={{ fontSize: 32, margin: "0 0 8px" }}>🏦</p>
          <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>Ninguna cuenta aún</p>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 18px" }}>
            Agrega tu banco, wallet o efectivo para empezar a registrar movimientos.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
              color: "#fff", border: "none", borderRadius: 14,
              padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Agregar primera cuenta
          </button>
        </div>
      )}

      {/* Account list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {accounts.map((acc) => {
          const info = typeInfo(acc.accountType);
          return (
            <div key={acc.id} style={{
              background: "var(--surf)", border: "1px solid var(--border)",
              borderRadius: 18, padding: "16px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: acc.color || "var(--surf2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>
                {info?.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, margin: 0 }}>{acc.name}</p>
                <p style={{ color: "var(--muted)", fontSize: 12, margin: "2px 0 0" }}>{info?.label}</p>
              </div>
              <p style={{ color: "var(--text)", fontSize: 16, fontWeight: 800, margin: 0 }}>$0.00</p>
            </div>
          );
        })}
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-end", zIndex: 50,
        }}>
          <div style={{
            background: "var(--surf)", borderRadius: "24px 24px 0 0",
            padding: "24px 20px 36px", width: "100%", maxWidth: 430, margin: "0 auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0 }}>Nueva cuenta</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            {/* Name */}
            <label style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: BBVA, Efectivo, Binance…"
              style={{
                width: "100%", marginTop: 6, marginBottom: 16,
                background: "var(--surf2)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "12px 14px",
                color: "var(--text)", fontSize: 15, outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* Type */}
            <label style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Tipo</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6, marginBottom: 16 }}>
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, accountType: t.value }))}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderRadius: 12, cursor: "pointer",
                    border: form.accountType === t.value
                      ? "2px solid #1e88e5"
                      : "1px solid var(--border)",
                    background: form.accountType === t.value ? "rgba(30,136,229,0.1)" : "var(--surf2)",
                    color: "var(--text)", fontSize: 13, fontWeight: 600,
                  }}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>

            {/* Color */}
            <label style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Color</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 24 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: c, border: form.color === c ? "3px solid #fff" : "2px solid transparent",
                    cursor: "pointer", outline: form.color === c ? `2px solid ${c}` : "none",
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              style={{
                width: "100%", padding: "14px 0",
                background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
                color: "#fff", border: "none", borderRadius: 16,
                fontSize: 16, fontWeight: 800, cursor: "pointer",
                opacity: saving || !form.name.trim() ? 0.6 : 1,
              }}
            >
              {saving ? "Guardando…" : "Guardar cuenta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

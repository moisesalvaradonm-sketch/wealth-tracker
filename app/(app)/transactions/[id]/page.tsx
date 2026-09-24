"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  INCOME:     { label: "Ingreso",       color: "#3fb950", emoji: "💰" },
  EXPENSE:    { label: "Gasto",         color: "#f85149", emoji: "💸" },
  TRANSFER:   { label: "Transferencia", color: "#58a6ff", emoji: "↔️" },
  INVESTMENT: { label: "Inversión",     color: "#bc8cff", emoji: "📈" },
  DIVIDEND:   { label: "Dividendo",     color: "#3fb950", emoji: "💹" },
  FEE:        { label: "Cargo",         color: "#f85149", emoji: "🏦" },
  WITHDRAWAL: { label: "Retiro",        color: "#e6b34d", emoji: "💵" },
  DEPOSIT:    { label: "Depósito",      color: "#3fb950", emoji: "🏧" },
  ADJUSTMENT: { label: "Ajuste",        color: "#7d8590", emoji: "⚙️" },
};

interface Transaction {
  id: string;
  date: string;
  description: string;
  txType: string;
  notes?: string;
  importSource?: string;
  category?: { name: string };
  entries: {
    amount: string;
    amountUsd: string;
    account: { name: string };
    asset: { symbol: string };
  }[];
}

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => r.json())
      .then((data) => { setTx(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.replace("/transactions");
    } else {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando…</p>
    </div>
  );

  if (!tx) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ fontSize: 32 }}>🔍</p>
      <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>Transacción no encontrada</p>
      <button onClick={() => router.back()} style={{ color: "var(--blue)", background: "none", border: "none", fontSize: 14, cursor: "pointer" }}>← Volver</button>
    </div>
  );

  const cfg = TYPE_CONFIG[tx.txType] ?? { label: tx.txType, color: "var(--muted)", emoji: "•" };
  const entry = tx.entries[0];
  const amount = entry ? parseFloat(entry.amount) : 0;
  const dateStr = new Date(tx.date).toLocaleDateString("es-PA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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
        <h2 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0, flex: 1 }}>Detalle</h2>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ background: "none", border: "none", color: "var(--red)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
        >
          🗑
        </button>
      </div>

      {/* Hero */}
      <div style={{
        margin: "20px 20px 0",
        background: `${cfg.color}18`,
        border: `1.5px solid ${cfg.color}40`,
        borderRadius: 22, padding: "24px 20px",
        textAlign: "center",
      }}>
        <p style={{ fontSize: 36, margin: "0 0 6px" }}>{cfg.emoji}</p>
        <p style={{ color: cfg.color, fontSize: 12, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 0.8 }}>{cfg.label}</p>
        <p style={{
          color: amount >= 0 ? "var(--green)" : "var(--red)",
          fontSize: 44, fontWeight: 800,
          letterSpacing: "-2px", margin: "0 0 6px",
          fontFamily: "var(--font-mono)",
        }}>
          {amount >= 0 ? "+" : ""}{fmt(amount)}
        </p>
        <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 600, margin: 0 }}>{tx.description}</p>
      </div>

      {/* Details */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
        {[
          { label: "Fecha", value: dateStr },
          { label: "Cuenta", value: entry?.account.name ?? "—" },
          { label: "Categoría", value: tx.category?.name ?? "Sin categoría" },
          { label: "Activo", value: entry?.asset.symbol ?? "USD" },
          ...(tx.notes ? [{ label: "Notas", value: tx.notes }] : []),
          ...(tx.importSource ? [{ label: "Origen", value: tx.importSource }] : []),
        ].map((row, i, arr) => (
          <div key={row.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            padding: "14px 0",
            borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>{row.label}</span>
            <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Delete confirm sheet */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "flex-end", zIndex: 50,
        }}>
          <div style={{
            background: "var(--surf)", borderRadius: "24px 24px 0 0",
            padding: "24px 20px 40px", width: "100%", maxWidth: 430, margin: "0 auto",
          }}>
            <p style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>⚠️</p>
            <p style={{ color: "var(--text)", fontSize: 16, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
              ¿Eliminar esta transacción?
            </p>
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", margin: "0 0 24px", lineHeight: 1.5 }}>
              Se borrará permanentemente y el saldo de la cuenta se actualizará.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{
                  flex: 1, padding: "14px 0",
                  background: "var(--surf2)", border: "1px solid var(--border)",
                  borderRadius: 16, color: "var(--text)", fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: "14px 0",
                  background: "#f85149", border: "none",
                  borderRadius: 16, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Borrando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

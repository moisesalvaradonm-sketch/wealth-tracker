"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  INCOME:     { label: "Gané",    color: "#3fb950", emoji: "💰" },
  EXPENSE:    { label: "Gasté",   color: "#f85149", emoji: "💸" },
  TRANSFER:   { label: "Moví",    color: "#58a6ff", emoji: "↔️" },
  INVESTMENT: { label: "Invertí", color: "#bc8cff", emoji: "📈" },
  DIVIDEND:   { label: "Dividendo", color: "#3fb950", emoji: "💹" },
  FEE:        { label: "Cargo",   color: "#f85149", emoji: "🏦" },
  WITHDRAWAL: { label: "Retiro",  color: "#e6b34d", emoji: "💵" },
  DEPOSIT:    { label: "Depósito",color: "#3fb950", emoji: "🏧" },
  ADJUSTMENT: { label: "Ajuste", color: "#7d8590", emoji: "⚙️" },
};

interface Entry { amount: string; account: { name: string }; asset: { symbol: string } }
interface Transaction {
  id: string;
  date: string;
  description: string;
  txType: string;
  category?: { name: string };
  entries: Entry[];
}

function groupByDate(txs: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const d = new Date(tx.date);
    const key = d.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.entries(groups);
}

function formatAmount(tx: Transaction) {
  const entry = tx.entries[0];
  if (!entry) return "$0.00";
  const n = parseFloat(entry.amount);
  const abs = Math.abs(n).toFixed(2);
  const cfg = TYPE_CONFIG[tx.txType];
  const sign = n >= 0 ? "+" : "-";
  return { text: `${sign}$${abs}`, color: cfg?.color ?? "var(--muted)" };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((data) => { setTransactions(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const groups = groupByDate(transactions);

  return (
    <div style={{ padding: "20px 20px 0" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800, margin: 0 }}>Actividad</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "2px 0 0" }}>
            {transactions.length > 0 ? `${transactions.length} movimientos` : "Sin movimientos aún"}
          </p>
        </div>
        <Link href="/transactions/new" style={{
          background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
          color: "#fff", borderRadius: 12, padding: "9px 16px",
          fontSize: 13, fontWeight: 700, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 4,
        }}>
          + Agregar
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 48 }}>
          Cargando…
        </p>
      )}

      {/* Empty state */}
      {!loading && transactions.length === 0 && (
        <div style={{
          background: "var(--surf)", border: "1px solid var(--border)",
          borderRadius: 22, padding: "40px 20px", textAlign: "center", marginTop: 16,
        }}>
          <p style={{ fontSize: 40, margin: "0 0 10px" }}>📭</p>
          <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
            Ningún movimiento aún
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
            Registra tu primer gasto, ingreso o inversión.
          </p>
          <Link href="/transactions/new" style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            color: "#fff", borderRadius: 14, padding: "12px 28px",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}>
            Registrar movimiento
          </Link>
        </div>
      )}

      {/* Transaction groups */}
      {groups.map(([dateLabel, txs]) => (
        <div key={dateLabel} style={{ marginBottom: 20 }}>
          <p style={{
            color: "var(--muted)", fontSize: 12, fontWeight: 700,
            textTransform: "capitalize", letterSpacing: 0.5,
            margin: "0 0 8px",
          }}>
            {dateLabel}
          </p>

          <div style={{
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 18, overflow: "hidden",
          }}>
            {txs.map((tx, i) => {
              const cfg = TYPE_CONFIG[tx.txType] ?? { label: tx.txType, color: "var(--muted)", emoji: "•" };
              const amt = formatAmount(tx);
              return (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px",
                  borderTop: i > 0 ? "1px solid var(--border)" : "none",
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: `${cfg.color}22`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>
                    {cfg.emoji}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: "var(--text)", fontSize: 14, fontWeight: 700,
                      margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {tx.description}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: 12, margin: "2px 0 0" }}>
                      {cfg.label}{tx.category ? ` · ${tx.category.name}` : ""}
                      {tx.entries[0] ? ` · ${tx.entries[0].account.name}` : ""}
                    </p>
                  </div>

                  {/* Amount */}
                  <p style={{
                    color: typeof amt === "object" ? amt.color : "var(--text)",
                    fontSize: 15, fontWeight: 800, margin: 0, flexShrink: 0,
                    fontFamily: "var(--font-mono)",
                  }}>
                    {typeof amt === "object" ? amt.text : amt}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  INCOME:     { label: "Ingreso",    color: "#3fb950", emoji: "💰" },
  EXPENSE:    { label: "Gasto",      color: "#f85149", emoji: "💸" },
  TRANSFER:   { label: "Transferencia", color: "#58a6ff", emoji: "↔️" },
  INVESTMENT: { label: "Inversión",  color: "#bc8cff", emoji: "📈" },
  DIVIDEND:   { label: "Dividendo",  color: "#3fb950", emoji: "💹" },
  FEE:        { label: "Cargo",      color: "#f85149", emoji: "🏦" },
  WITHDRAWAL: { label: "Retiro",     color: "#e6b34d", emoji: "💵" },
  DEPOSIT:    { label: "Depósito",   color: "#3fb950", emoji: "🏧" },
  ADJUSTMENT: { label: "Ajuste",     color: "#7d8590", emoji: "⚙️" },
};

const FILTERS = [
  { value: "ALL",        label: "Todo" },
  { value: "EXPENSE",    label: "Gastos" },
  { value: "INCOME",     label: "Ingresos" },
  { value: "INVESTMENT", label: "Inversiones" },
  { value: "TRANSFER",   label: "Transferencias" },
];

interface Entry { amount: string; amountUsd: string; account: { name: string; entity?: { name: string } | null }; asset: { symbol: string } }
interface Transaction {
  id: string;
  date: string;
  description: string;
  txType: string;
  dataSource?: string;
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/transactions")
      .then((r) => r.json())
      .then((data) => { setTransactions(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const filtered = transactions.filter((tx) => {
    if (filter !== "ALL" && tx.txType !== filter) return false;
    if (search.trim() && !tx.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groups = groupByDate(filtered);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800, margin: 0 }}>Actividad</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "2px 0 0" }}>
              {loading ? "Cargando…" : `${filtered.length} movimiento${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link href="/transactions/new" style={{
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            color: "#fff", borderRadius: 12, padding: "9px 16px",
            fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>
            + Agregar
          </Link>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍  Buscar…"
          style={{
            width: "100%", marginBottom: 10, boxSizing: "border-box",
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "11px 14px",
            color: "var(--text)", fontSize: 14, outline: "none",
          }}
        />

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 16, scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                background: filter === f.value ? "#1e88e5" : "var(--surf)",
                color: filter === f.value ? "#fff" : "var(--muted)",
                outline: filter === f.value ? "none" : "1px solid var(--border)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", marginTop: 48 }}>Cargando…</p>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ margin: "0 20px", background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 22, padding: "40px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 36, margin: "0 0 8px" }}>📭</p>
          <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>
            {search || filter !== "ALL" ? "Sin resultados" : "Ningún movimiento aún"}
          </p>
          {!search && filter === "ALL" && (
            <Link href="/transactions/new" style={{ display: "inline-block", marginTop: 14, background: "linear-gradient(135deg, #1e88e5, #42a5f5)", color: "#fff", borderRadius: 14, padding: "12px 28px", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Registrar movimiento
            </Link>
          )}
        </div>
      )}

      {/* Groups */}
      <div style={{ padding: "0 20px" }}>
        {groups.map(([dateLabel, txs]) => {
          const dayTotal = txs.reduce((s, tx) => {
            const e = tx.entries.find((e) => !["SYS_INCOME", "SYS_EXPENSE"].includes(e.account.name));
            return s + (e ? Number(e.amountUsd ?? e.amount) : 0);
          }, 0);
          return (
            <div key={dateLabel} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, textTransform: "capitalize", letterSpacing: 0.3, margin: 0 }}>
                  {dateLabel}
                </p>
                <p style={{ color: dayTotal >= 0 ? "var(--green)" : "var(--red)", fontSize: 12, fontWeight: 700, margin: 0 }}>
                  {dayTotal >= 0 ? "+" : ""}{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dayTotal)}
                </p>
              </div>

              <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
                {txs.map((tx, i) => {
                  const cfg = TYPE_CONFIG[tx.txType] ?? { label: tx.txType, color: "var(--muted)", emoji: "•" };
                  const entry = tx.entries[0];
                  const amount = entry ? parseFloat(entry.amount) : 0;
                  const entityName = entry?.account?.entity?.name;
                  return (
                    <a key={tx.id} href={`/transactions/${tx.id}`} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                      borderTop: i > 0 ? "1px solid var(--border)" : "none",
                      textDecoration: "none",
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: `${cfg.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                        {cfg.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {tx.description}
                        </p>
                        <p style={{ color: "var(--muted)", fontSize: 11, margin: "2px 0 0" }}>
                          {tx.category?.name ?? cfg.label}
                          {entry && <span> · {entry.account.name}</span>}
                          {entityName && <span style={{ color: "#58a6ff" }}> · {entityName.split(" ")[0]}</span>}
                        </p>
                      </div>
                      <p style={{ color: amount >= 0 ? "var(--green)" : "var(--red)", fontSize: 14, fontWeight: 800, margin: 0, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {amount >= 0 ? "+" : ""}{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(amount))}
                      </p>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

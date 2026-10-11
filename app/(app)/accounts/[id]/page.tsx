"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const ACCOUNT_TYPES: Record<string, { label: string; icon: string }> = {
  CHECKING:     { label: "Cuenta corriente", icon: "🏦" },
  SAVINGS:      { label: "Ahorros",          icon: "🏧" },
  CASH:         { label: "Efectivo",          icon: "💵" },
  CREDIT:       { label: "Tarjeta de crédito",icon: "💳" },
  CRYPTO_WALLET:{ label: "Cripto wallet",     icon: "₿"  },
  BROKERAGE:    { label: "Broker / inversiones", icon: "📈" },
  OTHER:        { label: "Otro",              icon: "📁" },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  INCOME:     { label: "Ingreso",        color: "#3fb950", emoji: "💰" },
  EXPENSE:    { label: "Gasto",          color: "#f85149", emoji: "💸" },
  TRANSFER:   { label: "Transferencia",  color: "#58a6ff", emoji: "↔️" },
  INVESTMENT: { label: "Inversión",      color: "#bc8cff", emoji: "📈" },
  DIVIDEND:   { label: "Dividendo",      color: "#3fb950", emoji: "💹" },
  FEE:        { label: "Cargo",          color: "#f85149", emoji: "🏦" },
  WITHDRAWAL: { label: "Retiro",         color: "#e6b34d", emoji: "💵" },
  DEPOSIT:    { label: "Depósito",       color: "#3fb950", emoji: "🏧" },
  ADJUSTMENT: { label: "Ajuste",         color: "#7d8590", emoji: "⚙️" },
};

interface Account {
  id: string;
  name: string;
  accountType: string;
  color?: string;
  isActive: boolean;
  notes?: string;
  balance?: number;
  entity?: { id: string; name: string } | null;
}

interface Entry {
  amount: string;
  amountUsd: string;
  account: { name: string; accountRole?: string; entity?: { name: string } | null };
  asset: { symbol: string };
}

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
    const key = new Date(tx.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.entries(groups);
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([
      fetch(`/api/accounts/${id}`).then((r) => r.json()),
      fetch(`/api/transactions?accountId=${id}`).then((r) => r.json()),
    ]).then(([acc, txs]) => {
      setAccount(acc);
      setTransactions(Array.isArray(txs) ? txs : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--muted)", fontSize: 14 }}>Cargando…</p>
    </div>
  );

  if (!account) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ fontSize: 32 }}>🔍</p>
      <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700 }}>Cuenta no encontrada</p>
      <button onClick={() => router.back()} style={{ color: "var(--blue)", background: "none", border: "none", fontSize: 14, cursor: "pointer" }}>← Volver</button>
    </div>
  );

  const typeInfo = ACCOUNT_TYPES[account.accountType] ?? { label: account.accountType, icon: "📁" };
  const balance = account.balance ?? 0;
  const accentColor = account.color ?? "#58a6ff";

  const FILTERS = [
    { value: "ALL", label: "Todo" },
    { value: "EXPENSE", label: "Gastos" },
    { value: "INCOME", label: "Ingresos" },
    { value: "TRANSFER", label: "Transferencias" },
  ];

  const filtered = transactions.filter((tx) => filter === "ALL" || tx.txType === filter);
  const groups = groupByDate(filtered);

  // Stats
  const thisMonth = new Date();
  const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
  const monthTxs = transactions.filter((tx) => new Date(tx.date) >= monthStart);
  const monthOut = monthTxs.reduce((s, tx) => {
    const e = tx.entries.find((e) => e.account.accountRole !== "VIRTUAL");
    const n = e ? Number(e.amount) : 0;
    return s + (n < 0 ? Math.abs(n) : 0);
  }, 0);
  const monthIn = monthTxs.reduce((s, tx) => {
    const e = tx.entries.find((e) => e.account.accountRole !== "VIRTUAL");
    const n = e ? Number(e.amount) : 0;
    return s + (n > 0 ? n : 0);
  }, 0);

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
        <h2 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {account.name}
        </h2>
      </div>

      {/* Hero card */}
      <div style={{
        margin: "16px 20px 0",
        background: `${accentColor}15`,
        border: `1.5px solid ${accentColor}35`,
        borderRadius: 24, padding: "24px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: accentColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0, opacity: 0.9,
          }}>
            {typeInfo.icon}
          </div>
          <div>
            <p style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.6 }}>{typeInfo.label}</p>
            {account.entity && (
              <p style={{ color: accentColor, fontSize: 12, fontWeight: 700, margin: 0 }}>{account.entity.name}</p>
            )}
          </div>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Saldo actual</p>
        <p style={{
          color: balance < 0 ? "var(--red)" : "var(--text)",
          fontSize: 42, fontWeight: 800, letterSpacing: "-2px", margin: "0 0 16px",
          fontFamily: "var(--font-mono)",
        }}>
          {fmt(balance)}
        </p>
        {/* Month stats */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1, background: "rgba(248,81,73,0.1)", borderRadius: 12, padding: "10px 12px" }}>
            <p style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700, margin: "0 0 2px", textTransform: "uppercase" }}>Salidas este mes</p>
            <p style={{ color: "var(--red)", fontSize: 15, fontWeight: 800, margin: 0 }}>{fmt(monthOut)}</p>
          </div>
          <div style={{ flex: 1, background: "rgba(63,185,80,0.1)", borderRadius: 12, padding: "10px 12px" }}>
            <p style={{ color: "var(--muted)", fontSize: 10, fontWeight: 700, margin: "0 0 2px", textTransform: "uppercase" }}>Entradas este mes</p>
            <p style={{ color: "var(--green)", fontSize: 15, fontWeight: 800, margin: 0 }}>{fmt(monthIn)}</p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ padding: "14px 20px 0", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
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

      {/* Transactions */}
      <div style={{ padding: "12px 20px 100px" }}>
        {filtered.length === 0 && (
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px 20px", textAlign: "center", marginTop: 8 }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>📭</p>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: 0 }}>Sin movimientos</p>
          </div>
        )}

        {groups.map(([dateLabel, txs]) => {
          const dayTotal = txs.reduce((s, tx) => {
            const e = tx.entries.find((e) => e.account.accountRole !== "VIRTUAL" && !["SYS_INCOME","SYS_EXPENSE"].includes(e.account.name));
            return s + (e ? Number(e.amountUsd ?? e.amount) : 0);
          }, 0);
          return (
            <div key={dateLabel} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <p style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, textTransform: "capitalize", letterSpacing: 0.3, margin: 0 }}>
                  {dateLabel}
                </p>
                <p style={{ color: dayTotal >= 0 ? "var(--green)" : "var(--red)", fontSize: 12, fontWeight: 700, margin: 0 }}>
                  {dayTotal >= 0 ? "+" : ""}{fmt(dayTotal)}
                </p>
              </div>
              <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
                {txs.map((tx, i) => {
                  const cfg = TYPE_CONFIG[tx.txType] ?? { label: tx.txType, color: "var(--muted)", emoji: "•" };
                  const entry = tx.entries[0];
                  const amount = entry ? parseFloat(entry.amount) : 0;
                  return (
                    <Link key={tx.id} href={`/transactions/${tx.id}`} style={{
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
                        </p>
                      </div>
                      <p style={{ color: amount >= 0 ? "var(--green)" : "var(--red)", fontSize: 14, fontWeight: 800, margin: 0, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {amount >= 0 ? "+" : ""}{fmt(Math.abs(amount))}
                      </p>
                    </Link>
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

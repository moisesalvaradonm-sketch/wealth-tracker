import { prisma } from "@/lib/prisma";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

const TYPE_COLOR: Record<string, string> = {
  EXPENSE: "var(--red)", INCOME: "var(--green)",
  INVESTMENT: "var(--purple)", TRANSFER: "var(--muted)",
  DIVIDEND: "var(--green)", FEE: "var(--red)",
};
const TYPE_LABEL: Record<string, string> = {
  EXPENSE: "Gasto", INCOME: "Ingreso", INVESTMENT: "Inversión",
  TRANSFER: "Transferencia", DIVIDEND: "Dividendo", FEE: "Comisión",
};

export default async function DashboardPage() {
  const displayName = "Moises";

  const [netWorthAgg, recentTx, accountCount] = await Promise.all([
    prisma.transactionEntry.aggregate({
      where: { account: { includeInNetWorth: true, isActive: true } },
      _sum: { amountUsd: true },
    }),
    prisma.transaction.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        entries: { include: { account: { select: { name: true } } }, take: 1 },
        category: { select: { name: true } },
      },
    }),
    prisma.account.count({ where: { isActive: true } }),
  ]);

  const netWorth = Number(netWorthAgg._sum.amountUsd ?? 0);
  const hasData = recentTx.length > 0;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", paddingBottom: 100 }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "56px 24px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 2px", fontWeight: 500 }}>Bienvenido de vuelta</p>
            <p style={{ color: "var(--text)", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
              Hola, {displayName} 👋
            </p>
          </div>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 800, color: "#fff",
          }}>
            {displayName.charAt(0)}
          </div>
        </div>

        {/* Net worth card */}
        <div style={{
          background: "var(--surf)",
          border: "1px solid var(--border)",
          borderRadius: 24,
          padding: "24px 24px 20px",
          marginBottom: 16,
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -30, right: -30,
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(88,166,255,0.06)",
          }} />
          <p style={{ color: "var(--muted)", fontSize: 12, fontWeight: 600, margin: "0 0 8px", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Mi patrimonio
          </p>
          <p style={{
            color: netWorth < 0 ? "var(--red)" : "var(--text)", fontSize: 44, fontWeight: 800,
            letterSpacing: "-2px", margin: "0 0 4px",
            fontFamily: "var(--font-display)",
          }}>
            {fmt(netWorth)}
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
            {accountCount === 0 ? "Sin cuentas aún — agrega una para empezar" : `${accountCount} cuenta${accountCount !== 1 ? "s" : ""} activa${accountCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <a href="/transactions/new/smart" style={{
            flex: 2, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, padding: "14px 0",
            background: "linear-gradient(135deg, #1e88e5, #42a5f5)",
            borderRadius: 16, textDecoration: "none",
          }}>
            <span style={{ fontSize: 18 }}>🎙️</span>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>Voz / Foto</span>
          </a>
          <a href="/transactions/new" style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, padding: "14px 0",
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 16, textDecoration: "none",
          }}>
            <span style={{ fontSize: 18 }}>＋</span>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Manual</span>
          </a>
          <a href="/accounts" style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, padding: "14px 0",
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 16, textDecoration: "none",
          }}>
            <span style={{ fontSize: 18 }}>🏦</span>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Cuentas</span>
          </a>
        </div>
      </div>

      {/* ── SECCIÓN ACTIVIDAD ── */}
      <div style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, margin: 0 }}>Actividad reciente</p>
          <a href="/transactions" style={{ color: "var(--blue)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Ver todo →</a>
        </div>

        {!hasData ? (
          <div style={{
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "32px 20px", textAlign: "center", marginBottom: 20,
          }}>
            <p style={{ fontSize: 28, margin: "0 0 10px" }}>💸</p>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>Sin movimientos</p>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 16px" }}>Registra tu primer gasto o ingreso</p>
            <a href="/transactions/new" style={{
              display: "inline-block", background: "rgba(88,166,255,0.15)",
              color: "var(--blue)", borderRadius: 10, padding: "9px 20px",
              fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>+ Nueva transacción</a>
          </div>
        ) : (
          <div style={{
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 20, overflow: "hidden", marginBottom: 20,
          }}>
            {recentTx.map((tx, i) => {
              const entry = tx.entries[0];
              const amount = entry ? Number(entry.amount) : 0;
              const color = TYPE_COLOR[tx.txType] ?? "var(--muted)";
              const isLast = i === recentTx.length - 1;
              const dateStr = new Date(tx.date).toLocaleDateString("es-PA", { month: "short", day: "numeric" });
              return (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "13px 16px",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15,
                  }}>
                    {tx.txType === "INCOME" ? "💰" : tx.txType === "INVESTMENT" ? "📈" : tx.txType === "TRANSFER" ? "↔️" : "💸"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.description}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: 11, margin: 0 }}>
                      {dateStr} · {tx.category?.name ?? TYPE_LABEL[tx.txType] ?? tx.txType}
                    </p>
                  </div>
                  <p style={{ color, fontSize: 14, fontWeight: 700, margin: 0, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {amount >= 0 ? "+" : ""}{fmt(amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Shortcuts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { emoji: "📈", label: "Inversiones", href: "/transactions", color: "#bc8cff" },
            { emoji: "💼", label: "Cuentas", href: "/accounts", color: "#58a6ff" },
          ].map((item) => (
            <a key={item.label} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--surf)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "16px",
              textDecoration: "none",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${item.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>
                {item.emoji}
              </div>
              <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 700 }}>{item.label}</span>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}

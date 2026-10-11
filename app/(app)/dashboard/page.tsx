import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
const TYPE_ICON: Record<string, string> = {
  INCOME: "💰", INVESTMENT: "📈", TRANSFER: "↔️", EXPENSE: "💸",
  DIVIDEND: "💰", FEE: "💸",
};

export default async function DashboardPage() {
  const displayName = "Moises";

  const netWorthAgg = await prisma.transactionEntry.aggregate({
    where: { account: { includeInNetWorth: true, isActive: true } },
    _sum: { amountUsd: true },
  });

  const entities = await prisma.entity.findMany({ orderBy: { name: "asc" } });
  const entityBalances = await Promise.all(
    entities.map(async (e) => {
      const agg = await prisma.transactionEntry.aggregate({
        where: { account: { entityId: e.id, includeInNetWorth: true, isActive: true } },
        _sum: { amountUsd: true },
      });
      return { name: e.name, balance: Number(agg._sum.amountUsd ?? 0) };
    })
  );

  const recentTx = await prisma.transaction.findMany({
    take: 7,
    orderBy: { date: "desc" },
    include: {
      entries: {
        where: { account: { accountRole: { not: "VIRTUAL" } } },
        include: { account: { select: { name: true, entity: { select: { name: true } } } } },
        take: 1,
      },
      category: { select: { name: true } },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [monthExpenses, monthIncome] = await Promise.all([
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { lt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart } },
      _sum: { amountUsd: true },
    }),
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { gt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart } },
      _sum: { amountUsd: true },
    }),
  ]);

  const netWorth = Number(netWorthAgg._sum.amountUsd ?? 0);
  const thisMonthExp = Math.abs(Number(monthExpenses._sum.amountUsd ?? 0));
  const thisMonthInc = Number(monthIncome._sum.amountUsd ?? 0);
  const accountCount = await prisma.account.count({ where: { isActive: true, accountRole: { not: "VIRTUAL" } } });
  const monthName = now.toLocaleDateString("es-PA", { month: "short" });

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", paddingBottom: 100 }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "56px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
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
          background: "linear-gradient(135deg, #1565c0, #1e88e5)",
          borderRadius: 24, padding: "22px 22px 18px",
          marginBottom: 12, position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, margin: "0 0 6px", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Patrimonio total · {accountCount} cuenta{accountCount !== 1 ? "s" : ""}
          </p>
          <p style={{ color: "#fff", fontSize: 42, fontWeight: 800, letterSpacing: "-2px", margin: "0 0 14px" }}>
            {fmt(netWorth)}
          </p>
          {entityBalances.length > 0 && (
            <div style={{ display: "flex", gap: 10 }}>
              {entityBalances.map((e) => (
                <div key={e.name} style={{ flex: 1, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "8px 12px" }}>
                  <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {e.name.split(" ")[0]}
                  </p>
                  <p style={{ color: "#fff", fontSize: 15, fontWeight: 800, margin: 0 }}>{fmt(e.balance)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Month stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, padding: "14px 16px" }}>
            <p style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Gastos {monthName}</p>
            <p style={{ color: "var(--red)", fontSize: 20, fontWeight: 800, margin: 0 }}>{fmt(thisMonthExp)}</p>
          </div>
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, padding: "14px 16px" }}>
            <p style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Ingresos {monthName}</p>
            <p style={{ color: "var(--green)", fontSize: 20, fontWeight: 800, margin: 0 }}>{fmt(thisMonthInc)}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 10 }}>
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
          <a href="/reports" style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 6, padding: "14px 0",
            background: "var(--surf)", border: "1px solid var(--border)",
            borderRadius: 16, textDecoration: "none",
          }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <span style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700 }}>Reporte</span>
          </a>
        </div>
      </div>

      {/* ── ACTIVIDAD RECIENTE ── */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, margin: 0 }}>Actividad reciente</p>
          <a href="/transactions" style={{ color: "var(--blue)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>Ver todo →</a>
        </div>

        {recentTx.length === 0 ? (
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px 20px", textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 28, margin: "0 0 10px" }}>💸</p>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>Sin movimientos</p>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 16px" }}>Registra tu primer gasto o ingreso</p>
            <a href="/transactions/new" style={{ display: "inline-block", background: "rgba(88,166,255,0.15)", color: "var(--blue)", borderRadius: 10, padding: "9px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              + Nueva transacción
            </a>
          </div>
        ) : (
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", marginBottom: 20 }}>
            {recentTx.map((tx, i) => {
              const entry = tx.entries[0];
              const amount = entry ? Number(entry.amount) : 0;
              const color = TYPE_COLOR[tx.txType] ?? "var(--muted)";
              const isLast = i === recentTx.length - 1;
              const dateStr = new Date(tx.date).toLocaleDateString("es-PA", { month: "short", day: "numeric" });
              const entityName = entry?.account?.entity?.name;
              return (
                <a key={tx.id} href={`/transactions/${tx.id}`} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                  textDecoration: "none",
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                    {TYPE_ICON[tx.txType] ?? "💸"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tx.description}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: 11, margin: 0 }}>
                      {dateStr} · {tx.category?.name ?? TYPE_LABEL[tx.txType] ?? tx.txType}
                      {entityName && <span style={{ color: "#58a6ff", marginLeft: 4 }}>· {entityName.split(" ")[0]}</span>}
                    </p>
                  </div>
                  <p style={{ color, fontSize: 14, fontWeight: 700, margin: 0, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                    {amount >= 0 ? "+" : ""}{fmt(amount)}
                  </p>
                </a>
              );
            })}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { emoji: "🏦", label: "Cuentas", href: "/accounts", color: "#58a6ff" },
            { emoji: "📊", label: "Reporte", href: "/reports", color: "#3fb950" },
          ].map((item) => (
            <a key={item.label} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "var(--surf)", border: "1px solid var(--border)",
              borderRadius: 16, padding: "16px", textDecoration: "none",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
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

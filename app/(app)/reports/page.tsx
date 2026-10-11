import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

export default async function ReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // This month
  const [thisExp, thisInc, prevExp, prevInc] = await Promise.all([
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { lt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart } },
      _sum: { amountUsd: true },
    }),
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { gt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart } },
      _sum: { amountUsd: true },
    }),
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { lt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amountUsd: true },
    }),
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { gt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amountUsd: true },
    }),
  ]);

  const thisMonthExp = Math.abs(Number(thisExp._sum.amountUsd ?? 0));
  const thisMonthInc = Number(thisInc._sum.amountUsd ?? 0);
  const prevMonthExp = Math.abs(Number(prevExp._sum.amountUsd ?? 0));
  const prevMonthInc = Number(prevInc._sum.amountUsd ?? 0);

  // Category breakdown this month (expenses)
  const txThisMonth = await prisma.transaction.findMany({
    where: { date: { gte: monthStart }, txType: { in: ["EXPENSE", "FEE"] } },
    include: {
      category: { select: { name: true } },
      entries: {
        where: { amountUsd: { lt: 0 }, account: { accountRole: { not: "VIRTUAL" } } },
        select: { amountUsd: true },
      },
    },
  });

  const catMap = new Map<string, number>();
  for (const tx of txThisMonth) {
    const cat = tx.category?.name ?? "Sin categoría";
    const sum = tx.entries.reduce((s, e) => s + Math.abs(Number(e.amountUsd)), 0);
    catMap.set(cat, (catMap.get(cat) ?? 0) + sum);
  }
  const categories = Array.from(catMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxCat = categories[0]?.[1] ?? 1;

  // Per-entity this month
  const entities = await prisma.entity.findMany({ orderBy: { name: "asc" } });
  const entityStats = await Promise.all(
    entities.map(async (e) => {
      const [exp, inc] = await Promise.all([
        prisma.transactionEntry.aggregate({
          where: { amountUsd: { lt: 0 }, account: { entityId: e.id, accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart } },
          _sum: { amountUsd: true },
        }),
        prisma.transactionEntry.aggregate({
          where: { amountUsd: { gt: 0 }, account: { entityId: e.id, accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart } },
          _sum: { amountUsd: true },
        }),
      ]);
      return {
        name: e.name,
        expenses: Math.abs(Number(exp._sum.amountUsd ?? 0)),
        income: Number(inc._sum.amountUsd ?? 0),
      };
    })
  );

  const thisMonthName = now.toLocaleDateString("es-PA", { month: "long" });
  const prevMonthName = new Date(prevMonthStart).toLocaleDateString("es-PA", { month: "long" });
  const expDiff = thisMonthExp - prevMonthExp;
  const incDiff = thisMonthInc - prevMonthInc;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", paddingBottom: 100 }}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Link href="/dashboard" style={{ color: "var(--muted)", fontSize: 22, textDecoration: "none", lineHeight: 1 }}>←</Link>
          <div>
            <h1 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800, margin: 0 }}>Reporte mensual</h1>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0, textTransform: "capitalize" }}>{thisMonthName} {now.getFullYear()}</p>
          </div>
        </div>

        {/* This month vs last month */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px" }}>
            <p style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Gastos</p>
            <p style={{ color: "var(--red)", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{fmt(thisMonthExp)}</p>
            {prevMonthExp > 0 && (
              <p style={{ color: expDiff > 0 ? "var(--red)" : "var(--green)", fontSize: 11, margin: 0, fontWeight: 600 }}>
                {expDiff > 0 ? "▲" : "▼"} {fmt(Math.abs(expDiff))} vs {prevMonthName}
              </p>
            )}
          </div>
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px" }}>
            <p style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.4 }}>Ingresos</p>
            <p style={{ color: "var(--green)", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{fmt(thisMonthInc)}</p>
            {prevMonthInc > 0 && (
              <p style={{ color: incDiff >= 0 ? "var(--green)" : "var(--red)", fontSize: 11, margin: 0, fontWeight: 600 }}>
                {incDiff >= 0 ? "▲" : "▼"} {fmt(Math.abs(incDiff))} vs {prevMonthName}
              </p>
            )}
          </div>
        </div>

        {/* Net this month */}
        <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600, margin: 0 }}>Flujo neto {thisMonthName}</p>
          <p style={{
            color: (thisMonthInc - thisMonthExp) >= 0 ? "var(--green)" : "var(--red)",
            fontSize: 20, fontWeight: 800, margin: 0,
          }}>
            {fmt(thisMonthInc - thisMonthExp)}
          </p>
        </div>

        {/* Per-entity */}
        {entityStats.length > 0 && (
          <>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Por entidad</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {entityStats.map((e) => (
                <div key={e.name} style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 16, padding: "14px 16px" }}>
                  <p style={{ color: "var(--text)", fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>{e.name}</p>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div>
                      <p style={{ color: "var(--muted)", fontSize: 10, fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase" }}>Gastos</p>
                      <p style={{ color: "var(--red)", fontSize: 15, fontWeight: 800, margin: 0 }}>{fmt(e.expenses)}</p>
                    </div>
                    <div>
                      <p style={{ color: "var(--muted)", fontSize: 10, fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase" }}>Ingresos</p>
                      <p style={{ color: "var(--green)", fontSize: 15, fontWeight: 800, margin: 0 }}>{fmt(e.income)}</p>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <p style={{ color: "var(--muted)", fontSize: 10, fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase" }}>Neto</p>
                      <p style={{ color: (e.income - e.expenses) >= 0 ? "var(--green)" : "var(--red)", fontSize: 15, fontWeight: 800, margin: 0 }}>{fmt(e.income - e.expenses)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Category breakdown */}
        {categories.length > 0 && (
          <>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>Gastos por categoría</p>
            <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", marginBottom: 20 }}>
              {categories.map(([cat, amount], i) => {
                const pct = (amount / maxCat) * 100;
                const isLast = i === categories.length - 1;
                return (
                  <div key={cat} style={{ padding: "12px 16px", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{cat}</span>
                      <span style={{ color: "var(--red)", fontSize: 13, fontWeight: 700 }}>{fmt(amount)}</span>
                    </div>
                    <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                      <div style={{ height: 4, width: `${pct}%`, background: "var(--red)", borderRadius: 2, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {categories.length === 0 && (
          <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 20, padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>📊</p>
            <p style={{ color: "var(--text)", fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>Sin datos este mes</p>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>Los gastos de {thisMonthName} aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}

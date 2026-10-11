import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

function parseMonth(monthParam: string | undefined): { year: number; month: number } {
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function offsetMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const { year, month } = parseMonth(sp.month);

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
  const prevMonthStart = new Date(year, month - 1, 1);
  const prevMonthEnd = new Date(year, month, 0, 23, 59, 59);

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const prevSlug = offsetMonth(year, month, -1);
  const nextSlug = offsetMonth(year, month, 1);
  const isNextFuture = new Date(year, month + 1, 1) > now;

  const [thisExp, thisInc, prevExp, prevInc] = await Promise.all([
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { lt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amountUsd: true },
    }),
    prisma.transactionEntry.aggregate({
      where: { amountUsd: { gt: 0 }, account: { accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart, lte: monthEnd } },
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

  const txThisMonth = await prisma.transaction.findMany({
    where: { date: { gte: monthStart, lte: monthEnd }, txType: { in: ["EXPENSE", "FEE"] } },
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

  const entities = await prisma.entity.findMany({ orderBy: { name: "asc" } });
  const entityStats = await Promise.all(
    entities.map(async (e) => {
      const [exp, inc] = await Promise.all([
        prisma.transactionEntry.aggregate({
          where: { amountUsd: { lt: 0 }, account: { entityId: e.id, accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { amountUsd: true },
        }),
        prisma.transactionEntry.aggregate({
          where: { amountUsd: { gt: 0 }, account: { entityId: e.id, accountRole: { not: "VIRTUAL" }, isActive: true }, createdAt: { gte: monthStart, lte: monthEnd } },
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

  const thisMonthName = new Date(year, month, 1).toLocaleDateString("es-PA", { month: "long" });
  const prevMonthName = new Date(year, month - 1, 1).toLocaleDateString("es-PA", { month: "long" });
  const expDiff = thisMonthExp - prevMonthExp;
  const incDiff = thisMonthInc - prevMonthInc;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", paddingBottom: 100 }}>
      <div style={{ padding: "20px 20px 0" }}>

        {/* Header with month navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <Link href="/dashboard" style={{ color: "var(--muted)", fontSize: 22, textDecoration: "none", lineHeight: 1, flexShrink: 0 }}>←</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800, margin: 0 }}>Reporte mensual</h1>
          </div>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", flexShrink: 0 }}>
            <Link
              href={`/reports?month=${prevSlug}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, color: "var(--muted)", textDecoration: "none", fontSize: 16, fontWeight: 700 }}
            >
              ‹
            </Link>
            <span style={{ color: "var(--text)", fontSize: 12, fontWeight: 700, textTransform: "capitalize", padding: "0 6px", whiteSpace: "nowrap" }}>
              {thisMonthName} {year}
            </span>
            <Link
              href={isNextFuture ? "#" : `/reports?month=${nextSlug}`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36,
                color: isNextFuture ? "var(--border)" : "var(--muted)",
                textDecoration: "none", fontSize: 16, fontWeight: 700,
                pointerEvents: isNextFuture ? "none" : "auto",
              }}
            >
              ›
            </Link>
          </div>
        </div>

        {isCurrentMonth && (
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "-16px 0 16px", fontStyle: "italic" }}>Mes en curso · datos parciales</p>
        )}

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

        {/* Net */}
        <div style={{ background: "var(--surf)", border: "1px solid var(--border)", borderRadius: 18, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600, margin: 0, textTransform: "capitalize" }}>Flujo neto · {thisMonthName}</p>
          <p style={{ color: (thisMonthInc - thisMonthExp) >= 0 ? "var(--green)" : "var(--red)", fontSize: 20, fontWeight: 800, margin: 0 }}>
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

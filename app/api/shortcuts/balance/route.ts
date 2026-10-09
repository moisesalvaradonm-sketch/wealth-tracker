import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = req.headers.get("x-shortcuts-secret");
  const expected = process.env.SHORTCUTS_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [netWorthAgg, accounts] = await Promise.all([
    prisma.transactionEntry.aggregate({
      where: { account: { includeInNetWorth: true, isActive: true } },
      _sum: { amountUsd: true },
    }),
    prisma.account.findMany({
      where: { isActive: true, accountRole: { not: "VIRTUAL" } },
      select: {
        name: true,
        accountType: true,
        accountRole: true,
        includeInNetWorth: true,
        entity: { select: { name: true } },
        _count: false,
      },
    }),
  ]);

  // Compute per-account balances
  const accountBalances = await prisma.transactionEntry.groupBy({
    by: ["accountId"],
    where: { account: { isActive: true, accountRole: { not: "VIRTUAL" } } },
    _sum: { amountUsd: true },
  });

  const accountMap = new Map(accounts.map((a) => [a.name, a]));

  // Join account info with balances
  const accountsWithIds = await prisma.account.findMany({
    where: { isActive: true, accountRole: { not: "VIRTUAL" } },
    select: { id: true, name: true, accountType: true, accountRole: true, includeInNetWorth: true, entity: { select: { name: true } } },
  });

  const idToAccount = new Map(accountsWithIds.map((a) => [a.id, a]));

  const balances = accountBalances
    .map((b) => {
      const acct = idToAccount.get(b.accountId);
      if (!acct) return null;
      return {
        name: acct.name,
        entity: acct.entity?.name ?? null,
        type: acct.accountType,
        role: acct.accountRole,
        inNetWorth: acct.includeInNetWorth,
        balance: Number(b._sum.amountUsd ?? 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b!.balance) - Math.abs(a!.balance));

  const netWorth = Number(netWorthAgg._sum.amountUsd ?? 0);

  return NextResponse.json({
    netWorth,
    netWorthFormatted: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(netWorth),
    accounts: balances,
    asOf: new Date().toISOString(),
  });
}

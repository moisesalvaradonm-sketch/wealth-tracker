/**
 * One-time seed endpoint. Call after each schema migration.
 * Protected by APP_PIN — never expose this without the PIN check.
 * POST /api/setup  body: { pin: "xxxx" }
 */
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { pin } = await req.json().catch(() => ({ pin: "" }));

  if (!process.env.APP_PIN || pin !== process.env.APP_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];

  // 1. Entities
  const personal = await prisma.entity.upsert({
    where: { name: "Personal" },
    update: {},
    create: { name: "Personal", type: "PERSONAL" },
  });

  const business = await prisma.entity.upsert({
    where: { name: "MR Global Partners" },
    update: {},
    create: { name: "MR Global Partners", type: "BUSINESS" },
  });

  log.push(`Entidades: ${personal.name}, ${business.name}`);

  // 2. Assign business accounts
  const mercuryUpdated = await prisma.account.updateMany({
    where: { name: { contains: "mercury", mode: "insensitive" }, entityId: null },
    data: { entityId: business.id },
  });
  const relayUpdated = await prisma.account.updateMany({
    where: { name: { contains: "relay", mode: "insensitive" }, entityId: null },
    data: { entityId: business.id },
  });
  const personalUpdated = await prisma.account.updateMany({
    where: { entityId: null },
    data: { entityId: personal.id },
  });

  log.push(`Cuentas business: ${mercuryUpdated.count + relayUpdated.count}, personal: ${personalUpdated.count}`);

  // 3. System virtual accounts
  const INCOME_NAME = "__system_income__";
  const EXPENSE_NAME = "__system_expense__";

  let usd = await prisma.asset.findUnique({ where: { symbol: "USD" } });
  if (!usd) {
    usd = await prisma.asset.create({
      data: { symbol: "USD", name: "US Dollar", assetType: "FIAT", decimals: 2, isStableCoin: false },
    });
  }

  const sysIncome =
    (await prisma.account.findFirst({ where: { name: INCOME_NAME } })) ??
    (await prisma.account.create({
      data: { name: INCOME_NAME, accountType: "OTHER", accountRole: "VIRTUAL", includeInNetWorth: false, isManual: false },
    }));

  const sysExpense =
    (await prisma.account.findFirst({ where: { name: EXPENSE_NAME } })) ??
    (await prisma.account.create({
      data: { name: EXPENSE_NAME, accountType: "OTHER", accountRole: "VIRTUAL", includeInNetWorth: false, isManual: false },
    }));

  log.push(`Cuentas sistema: ${sysIncome.name}, ${sysExpense.name}`);

  // 4. Balance existing single-entry transactions
  const unbalanced = await prisma.transaction.findMany({
    where: {
      txType: { in: ["EXPENSE", "FEE", "WITHDRAWAL", "INCOME", "DIVIDEND", "INTEREST", "DEPOSIT"] },
    },
    include: { entries: true },
  });

  let fixed = 0;
  for (const tx of unbalanced) {
    if (tx.entries.length >= 2 || tx.entries.length === 0) continue;

    const [entry] = tx.entries;
    const isOutflow = ["EXPENSE", "FEE", "WITHDRAWAL"].includes(tx.txType);
    const balanceAccountId = isOutflow ? sysExpense.id : sysIncome.id;
    const balanceAmount = isOutflow
      ? Math.abs(Number(entry.amountUsd))
      : -Math.abs(Number(entry.amountUsd));

    await prisma.transactionEntry.create({
      data: {
        transactionId: tx.id,
        accountId: balanceAccountId,
        assetId: entry.assetId,
        amount: balanceAmount.toFixed(8),
        amountUsd: balanceAmount.toFixed(8),
        sortOrder: 1,
      },
    });
    fixed++;
  }

  if (fixed > 0) log.push(`Balanceados ${fixed} transacciones históricas`);

  log.push("✅ Setup completo");

  return NextResponse.json({ ok: true, log });
}

/**
 * Run after every schema migration:
 *   npx tsx prisma/seed.ts
 *
 * Idempotent — safe to run multiple times.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding…");

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

  console.log(`  ✓ Entidades: ${personal.name}, ${business.name}`);

  // 2. Assign business accounts (Mercury, Relay)
  const businessUpdated = await prisma.account.updateMany({
    where: {
      name: { contains: "mercury", mode: "insensitive" },
      entityId: null,
    },
    data: { entityId: business.id },
  });

  const relayUpdated = await prisma.account.updateMany({
    where: {
      name: { contains: "relay", mode: "insensitive" },
      entityId: null,
    },
    data: { entityId: business.id },
  });

  // All remaining accounts → personal
  const personalUpdated = await prisma.account.updateMany({
    where: { entityId: null },
    data: { entityId: personal.id },
  });

  console.log(`  ✓ Cuentas business: ${businessUpdated.count + relayUpdated.count}, personal: ${personalUpdated.count}`);

  // 3. System virtual accounts for double-entry
  const INCOME_NAME = "__system_income__";
  const EXPENSE_NAME = "__system_expense__";

  // Find or create USD asset first
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

  console.log(`  ✓ Cuentas sistema: ${sysIncome.name}, ${sysExpense.name}`);

  // 4. Fix existing single-entry EXPENSE/INCOME transactions
  //    Add the balancing virtual entry if missing
  const unbalancedTxs = await prisma.transaction.findMany({
    where: {
      txType: { in: ["EXPENSE", "FEE", "WITHDRAWAL", "INCOME", "DIVIDEND", "INTEREST", "DEPOSIT"] },
    },
    include: { entries: true },
  });

  let fixed = 0;
  for (const tx of unbalancedTxs) {
    // Already has 2+ entries — skip
    if (tx.entries.length >= 2) continue;
    if (tx.entries.length === 0) continue;

    const [entry] = tx.entries;
    const isOutflow = ["EXPENSE", "FEE", "WITHDRAWAL"].includes(tx.txType);

    // The balancing entry goes to the system account
    const balanceAccountId = isOutflow ? sysExpense.id : sysIncome.id;
    const balanceAmount = isOutflow
      ? Math.abs(Number(entry.amountUsd))        // positive to expense sink
      : -Math.abs(Number(entry.amountUsd));       // negative from income source

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

  if (fixed > 0) console.log(`  ✓ Balanceados ${fixed} transacciones históricas con asiento virtual`);

  console.log("✅ Seed completo");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

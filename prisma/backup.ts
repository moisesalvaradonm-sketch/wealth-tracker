/**
 * Run before any schema migration:
 *   npx tsx prisma/backup.ts
 * Saves a JSON snapshot of all current data for rollback.
 */
import { prisma } from "../lib/prisma";
import { writeFileSync } from "fs";

async function backup() {
  const [transactions, accounts, categories, assets, institutions] = await Promise.all([
    prisma.transaction.findMany({ include: { entries: true, category: true, tags: true } }),
    prisma.account.findMany({ include: { institution: true } }),
    prisma.category.findMany(),
    prisma.asset.findMany(),
    prisma.institution.findMany(),
  ]);

  const data = {
    _meta: {
      backedUpAt: new Date().toISOString(),
      counts: {
        transactions: transactions.length,
        accounts: accounts.length,
        categories: categories.length,
        assets: assets.length,
      },
    },
    transactions,
    accounts,
    categories,
    assets,
    institutions,
  };

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Backup guardado en ${filename}`);
  console.log(`   Transacciones: ${transactions.length}`);
  console.log(`   Cuentas: ${accounts.length}`);
}

backup()
  .catch((e) => { console.error("Backup failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

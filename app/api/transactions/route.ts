import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { buildJournalEntries, validateBalance, getSystemAccounts } from "@/lib/ledger";
import { writeAudit } from "@/lib/audit";

async function getOrCreateUsdAsset() {
  let asset = await prisma.asset.findUnique({ where: { symbol: "USD" } });
  if (!asset) {
    asset = await prisma.asset.create({
      data: { symbol: "USD", name: "US Dollar", assetType: "FIAT", decimals: 2, isStableCoin: false },
    });
  }
  return asset;
}

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    include: {
      entries: { include: { account: true, asset: true } },
      category: true,
    },
    orderBy: { date: "desc" },
    take: 50,
  });
  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { txType, amount, accountId, toAccountId, description, date, categoryName, notes } = body;

  if (!txType || !amount || !accountId || !description) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const parsedAmount = new Decimal(String(amount));
  if (parsedAmount.lte(0)) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  // TRANSFER / INVESTMENT / EXCHANGE require a destination account
  if (["TRANSFER", "INVESTMENT", "EXCHANGE"].includes(txType) && !toAccountId) {
    return NextResponse.json({ error: "Este tipo requiere cuenta destino" }, { status: 400 });
  }

  let systemAccounts: Awaited<ReturnType<typeof getSystemAccounts>>;
  try {
    systemAccounts = await getSystemAccounts(prisma);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  const asset = await getOrCreateUsdAsset();

  let categoryId: string | undefined;
  if (categoryName) {
    let cat = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!cat) cat = await prisma.category.create({ data: { name: categoryName } });
    categoryId = cat.id;
  }

  let entries: ReturnType<typeof buildJournalEntries>;
  try {
    entries = buildJournalEntries({
      txType,
      amount: parsedAmount,
      assetId: asset.id,
      accountId,
      toAccountId,
      systemIncomeAccountId: systemAccounts.income.id,
      systemExpenseAccountId: systemAccounts.expense.id,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!validateBalance(entries)) {
    return NextResponse.json({ error: "Error interno: asientos no balancean" }, { status: 500 });
  }

  const tx = await prisma.transaction.create({
    data: {
      date: date ? new Date(date) : new Date(),
      description,
      txType: txType as TransactionType,
      notes,
      categoryId,
      postedAt: new Date(),
      entries: {
        create: entries.map((e) => ({
          accountId: e.accountId,
          assetId: e.assetId,
          amount: e.amount.toFixed(8),
          amountUsd: e.amountUsd.toFixed(8),
          sortOrder: e.sortOrder,
        })),
      },
    },
    include: {
      entries: { include: { account: true, asset: true } },
      category: true,
    },
  });

  await writeAudit({ prisma, entityType: "Transaction", entityId: tx.id, action: "CREATE", newData: tx });

  return NextResponse.json(tx, { status: 201 });
}

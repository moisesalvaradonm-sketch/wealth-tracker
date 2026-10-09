import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { buildJournalEntries, validateBalance, getSystemAccounts } from "@/lib/ledger";

async function getOrCreateUsdAsset() {
  let asset = await prisma.asset.findUnique({ where: { symbol: "USD" } });
  if (!asset) {
    asset = await prisma.asset.create({
      data: { symbol: "USD", name: "US Dollar", assetType: "FIAT", decimals: 2, isStableCoin: false },
    });
  }
  return asset;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-shortcuts-secret");
  const expected = process.env.SHORTCUTS_SECRET;
  if (!expected) return NextResponse.json({ error: "Shortcuts not configured" }, { status: 503 });
  if (secret !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    amount?: string | number;
    description?: string;
    txType?: string;
    accountName?: string;
    toAccountName?: string;
    categoryName?: string;
    date?: string;
    externalRef?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { amount, description, txType = "EXPENSE", accountName, toAccountName, categoryName, date, externalRef } = body;

  if (!amount || !description) {
    return NextResponse.json({ error: "amount y description son requeridos" }, { status: 400 });
  }

  // Idempotency: if externalRef already exists, return existing transaction
  if (externalRef) {
    const existing = await prisma.transaction.findUnique({ where: { externalRef } });
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, id: existing.id });
    }
  }

  const parsedAmount = new Decimal(String(amount));
  if (parsedAmount.lte(0)) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  let account = accountName
    ? await prisma.account.findFirst({ where: { name: { contains: accountName, mode: "insensitive" }, isActive: true } })
    : null;
  if (!account) {
    account = await prisma.account.findFirst({
      where: { isActive: true, accountRole: { not: "VIRTUAL" } },
      orderBy: { createdAt: "asc" },
    });
  }
  if (!account) return NextResponse.json({ error: "No hay cuentas configuradas" }, { status: 422 });

  let toAccount = toAccountName
    ? await prisma.account.findFirst({ where: { name: { contains: toAccountName, mode: "insensitive" }, isActive: true } })
    : null;

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

  // TRANSFER/INVESTMENT/EXCHANGE require toAccountId, fall back to EXPENSE if not provided
  let resolvedTxType = txType;
  if (["TRANSFER", "INVESTMENT", "EXCHANGE"].includes(txType) && !toAccount) {
    resolvedTxType = "EXPENSE"; // graceful degradation
  }

  let entries: ReturnType<typeof buildJournalEntries>;
  try {
    entries = buildJournalEntries({
      txType: resolvedTxType,
      amount: parsedAmount,
      assetId: asset.id,
      accountId: account.id,
      toAccountId: toAccount?.id,
      systemIncomeAccountId: systemAccounts.income.id,
      systemExpenseAccountId: systemAccounts.expense.id,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!validateBalance(entries)) {
    return NextResponse.json({ error: "Error interno de balance" }, { status: 500 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      date: date ? new Date(date) : new Date(),
      description: String(description),
      txType: resolvedTxType as TransactionType,
      dataSource: "SHORTCUT_VOICE",
      categoryId,
      externalRef: externalRef ?? undefined,
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

  return NextResponse.json({
    ok: true,
    message: `✅ Registrado: ${description} — $${parsedAmount.toFixed(2)} en ${account.name}`,
    id: transaction.id,
  }, { status: 201 });
}

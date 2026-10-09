import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { buildJournalEntries, validateBalance, getSystemAccounts } from "@/lib/ledger";

function parseWalletNotification(text: string): { amount: number; merchant: string } {
  const amountMatch = text.match(/\$\s*([\d,]+\.?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
  const merchantMatch = text.match(/(?:\bat\s+|\ben\s+)(.+?)(?:\s*\.?\s*$)/i);
  const merchant = merchantMatch ? merchantMatch[1].trim() : "Apple Wallet";
  return { amount, merchant };
}

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
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string; accountName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, accountName } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
  }

  const { amount, merchant } = parseWalletNotification(text);
  if (amount <= 0) {
    return NextResponse.json({ error: `No encontré monto en: "${text}"` }, { status: 422 });
  }

  // Duplicate check: same amount in last 3 minutes
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const existingEntry = await prisma.transactionEntry.findFirst({
    where: {
      amountUsd: { lte: -(amount - 0.001), gte: -(amount + 0.001) },
      createdAt: { gte: threeMinutesAgo },
    },
    include: { transaction: true },
  });
  if (existingEntry) {
    return NextResponse.json({
      ok: true, duplicate: true,
      message: `⚠️ Duplicado detectado — $${amount.toFixed(2)} ya registrado`,
      id: existingEntry.transaction.id,
    });
  }

  let account = accountName
    ? await prisma.account.findFirst({
        where: { name: { contains: accountName, mode: "insensitive" }, isActive: true, accountRole: { not: "VIRTUAL" } },
      })
    : null;
  if (!account) {
    account = await prisma.account.findFirst({
      where: { isActive: true, includeInNetWorth: true, accountRole: { not: "VIRTUAL" } },
      orderBy: { createdAt: "asc" },
    });
  }
  if (!account) {
    return NextResponse.json({ error: "Crea una cuenta primero en el app" }, { status: 422 });
  }

  let systemAccounts: Awaited<ReturnType<typeof getSystemAccounts>>;
  try {
    systemAccounts = await getSystemAccounts(prisma);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }

  const asset = await getOrCreateUsdAsset();
  const parsedAmount = new Decimal(amount);

  const entries = buildJournalEntries({
    txType: "EXPENSE",
    amount: parsedAmount,
    assetId: asset.id,
    accountId: account.id,
    systemIncomeAccountId: systemAccounts.income.id,
    systemExpenseAccountId: systemAccounts.expense.id,
  });

  if (!validateBalance(entries)) {
    return NextResponse.json({ error: "Error interno de balance" }, { status: 500 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(),
      description: merchant,
      txType: "EXPENSE" as TransactionType,
      dataSource: "SHORTCUT_WALLET",
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
  });

  return NextResponse.json({
    ok: true,
    message: `✅ $${amount.toFixed(2)} en ${merchant}`,
    id: transaction.id,
  }, { status: 201 });
}

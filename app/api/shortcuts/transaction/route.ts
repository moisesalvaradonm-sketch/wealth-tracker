import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";

// iOS Shortcuts sends a POST with a shared secret + transaction data
// Set SHORTCUTS_SECRET in .env.local — Shortcut must include it as X-Shortcuts-Secret header

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
  // Validate shared secret
  const secret = req.headers.get("x-shortcuts-secret");
  const expected = process.env.SHORTCUTS_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "Shortcuts not configured" }, { status: 503 });
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    amount?: string | number;
    description?: string;
    txType?: string;
    accountName?: string;
    categoryName?: string;
    date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { amount, description, txType = "EXPENSE", accountName, categoryName, date } = body;

  if (!amount || !description) {
    return NextResponse.json({ error: "amount y description son requeridos" }, { status: 400 });
  }

  const parsedAmount = parseFloat(String(amount));
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  // Find account — by name or fall back to first active account
  let account = accountName
    ? await prisma.account.findFirst({ where: { name: { contains: accountName, mode: "insensitive" }, isActive: true } })
    : null;

  if (!account) {
    account = await prisma.account.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
  }

  if (!account) {
    return NextResponse.json({ error: "No hay cuentas configuradas. Crea una cuenta primero." }, { status: 422 });
  }

  const asset = await getOrCreateUsdAsset();

  // Category
  let categoryId: string | undefined;
  if (categoryName) {
    let cat = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!cat) cat = await prisma.category.create({ data: { name: categoryName } });
    categoryId = cat.id;
  }

  const outflowTypes = ["EXPENSE", "FEE", "WITHDRAWAL"];
  const entryAmount = outflowTypes.includes(txType) ? -parsedAmount : parsedAmount;

  const transaction = await prisma.transaction.create({
    data: {
      date: date ? new Date(date) : new Date(),
      description: String(description),
      txType: txType as TransactionType,
      categoryId,
      entries: {
        create: [{ accountId: account.id, assetId: asset.id, amount: entryAmount, amountUsd: entryAmount }],
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

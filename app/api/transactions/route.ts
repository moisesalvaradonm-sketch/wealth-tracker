import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";

// Ensure a USD asset exists, return its id
async function getOrCreateUsdAsset() {
  let asset = await prisma.asset.findUnique({ where: { symbol: "USD" } });
  if (!asset) {
    asset = await prisma.asset.create({
      data: {
        symbol: "USD",
        name: "US Dollar",
        assetType: "FIAT",
        decimals: 2,
        isStableCoin: false,
      },
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
  const { txType, amount, accountId, description, date, categoryName } = body;

  if (!txType || !amount || !accountId || !description) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  const asset = await getOrCreateUsdAsset();

  // Resolve or create category
  let categoryId: string | undefined;
  if (categoryName) {
    let cat = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!cat) cat = await prisma.category.create({ data: { name: categoryName } });
    categoryId = cat.id;
  }

  // Amount sign convention: INCOME/DEPOSIT = positive, EXPENSE/FEE/WITHDRAWAL = negative
  const outflowTypes = ["EXPENSE", "FEE", "WITHDRAWAL"];
  const entryAmount = outflowTypes.includes(txType) ? -parsedAmount : parsedAmount;

  const transaction = await prisma.transaction.create({
    data: {
      date: date ? new Date(date) : new Date(),
      description,
      txType: txType as TransactionType,
      categoryId,
      entries: {
        create: [
          {
            accountId,
            assetId: asset.id,
            amount: entryAmount,
            amountUsd: entryAmount,
          },
        ],
      },
    },
    include: {
      entries: { include: { account: true, asset: true } },
      category: true,
    },
  });

  return NextResponse.json(transaction, { status: 201 });
}

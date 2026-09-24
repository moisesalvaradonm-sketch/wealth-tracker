import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { NextResponse } from "next/server";

// Parses Apple Wallet notification text like:
// "You spent $12.50 at Starbucks" or "Gastaste $12.50 en Starbucks"
function parseWalletNotification(text: string): { amount: number; merchant: string } {
  const amountMatch = text.match(/\$\s*([\d,]+\.?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;

  // English: "at Merchant" / Spanish: "en Merchant"
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

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text } = body;
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
      amountUsd: -amount,
      createdAt: { gte: threeMinutesAgo },
    },
    include: { transaction: true },
  });
  if (existingEntry) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      message: `⚠️ Duplicado detectado — $${amount.toFixed(2)} ya registrado`,
      id: existingEntry.transaction.id,
    });
  }

  const account = await prisma.account.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!account) {
    return NextResponse.json({ error: "Crea una cuenta primero en el app" }, { status: 422 });
  }

  const asset = await getOrCreateUsdAsset();

  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(),
      description: merchant,
      txType: "EXPENSE" as TransactionType,
      entries: {
        create: [{ accountId: account.id, assetId: asset.id, amount: -amount, amountUsd: -amount }],
      },
    },
  });

  return NextResponse.json({
    ok: true,
    message: `✅ $${amount.toFixed(2)} en ${merchant}`,
    id: transaction.id,
  }, { status: 201 });
}

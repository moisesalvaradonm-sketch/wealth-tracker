import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    include: { institution: true },
    orderBy: { createdAt: "asc" },
  });

  // Attach balance (sum of all entry amounts) to each account
  const balances = await prisma.transactionEntry.groupBy({
    by: ["accountId"],
    _sum: { amountUsd: true },
  });
  const balanceMap = Object.fromEntries(balances.map((b) => [b.accountId, Number(b._sum.amountUsd ?? 0)]));

  const result = accounts.map((a) => ({ ...a, balance: balanceMap[a.id] ?? 0 }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {

  const body = await req.json();
  const { name, accountType, color, icon, notes } = body;

  if (!name || !accountType) {
    return NextResponse.json({ error: "name y accountType son requeridos" }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: { name, accountType, color, icon, notes, isManual: true, isActive: true },
  });

  return NextResponse.json(account, { status: 201 });
}

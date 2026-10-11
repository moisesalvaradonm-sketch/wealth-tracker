import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const account = await prisma.account.findUnique({
    where: { id },
    include: { institution: true, entity: { select: { id: true, name: true } } },
  });

  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const balance = await prisma.transactionEntry.aggregate({
    where: { accountId: id },
    _sum: { amountUsd: true },
  });

  return NextResponse.json({ ...account, balance: Number(balance._sum.amountUsd ?? 0) });
}

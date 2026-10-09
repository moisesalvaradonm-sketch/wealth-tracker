import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Decimal from "decimal.js";
import { validateBalance } from "@/lib/ledger";
import { writeAudit } from "@/lib/audit";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const original = await prisma.transaction.findUnique({
    where: { id },
    include: { entries: true },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (original.ledgerStatus === "REVERSED") {
    return NextResponse.json({ error: "Ya fue revertida" }, { status: 409 });
  }

  if (original.ledgerStatus === "DRAFT") {
    return NextResponse.json(
      { error: "Los borradores se pueden eliminar directamente, no revertir." },
      { status: 409 }
    );
  }

  // Check that original hasn't already been reversed
  const alreadyReversed = await prisma.transaction.findFirst({
    where: { reversalOfId: id, ledgerStatus: "POSTED" },
  });
  if (alreadyReversed) {
    return NextResponse.json(
      { error: "Esta transacción ya tiene una reversión activa." },
      { status: 409 }
    );
  }

  // Build negated entries
  const reversalEntries = original.entries.map((e, i) => ({
    accountId: e.accountId,
    assetId: e.assetId,
    amount: new Decimal(e.amount.toString()).neg().toFixed(8),
    amountUsd: new Decimal(e.amountUsd.toString()).neg().toFixed(8),
    sortOrder: i,
  }));

  // Validate balance of reversed entries
  const entryCheck = reversalEntries.map((e) => ({ amountUsd: new Decimal(e.amountUsd) }));
  if (!validateBalance(entryCheck)) {
    return NextResponse.json({ error: "Error interno al calcular reversión" }, { status: 500 });
  }

  // Atomically: create reversal + mark original as REVERSED
  const [reversal] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        date: new Date(),
        description: `Reversión: ${original.description}`,
        txType: original.txType,
        categoryId: original.categoryId ?? undefined,
        ledgerStatus: "POSTED",
        reversalOfId: original.id,
        postedAt: new Date(),
        entries: { create: reversalEntries },
      },
      include: {
        entries: { include: { account: true, asset: true } },
        category: true,
      },
    }),
    prisma.transaction.update({
      where: { id },
      data: { ledgerStatus: "REVERSED" },
    }),
  ]);

  await writeAudit({
    prisma, entityType: "Transaction", entityId: id,
    action: "REVERSE",
    oldData: { ledgerStatus: "POSTED" },
    newData: { ledgerStatus: "REVERSED", reversalTransactionId: reversal.id },
  });

  return NextResponse.json({ ok: true, reversal }, { status: 201 });
}

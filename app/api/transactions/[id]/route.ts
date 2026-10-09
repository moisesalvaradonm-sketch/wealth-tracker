import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      entries: { include: { account: true, asset: true } },
      category: true,
    },
  });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tx);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tx.ledgerStatus === "POSTED") {
    return NextResponse.json(
      { error: "Esta transacción está POSTED y no puede eliminarse. Usa Revertir." },
      { status: 409 }
    );
  }

  await prisma.transaction.delete({ where: { id } });
  await writeAudit({ prisma, entityType: "Transaction", entityId: id, action: "DELETE", oldData: tx });

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tx.ledgerStatus === "POSTED") {
    return NextResponse.json(
      { error: "Esta transacción está POSTED. Para corregirla usa Revertir." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { description, categoryName, date, notes } = body;

  let categoryId: string | undefined;
  if (categoryName) {
    let cat = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!cat) cat = await prisma.category.create({ data: { name: categoryName } });
    categoryId = cat.id;
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(notes !== undefined && { notes }),
      ...(categoryId !== undefined && { categoryId }),
    },
    include: {
      entries: { include: { account: true, asset: true } },
      category: true,
    },
  });

  await writeAudit({ prisma, entityType: "Transaction", entityId: id, action: "UPDATE", oldData: tx, newData: updated });

  return NextResponse.json(updated);
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
  try {
    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { description, categoryName, date, notes } = body;

  let categoryId: string | undefined;
  if (categoryName) {
    let cat = await prisma.category.findFirst({ where: { name: categoryName } });
    if (!cat) cat = await prisma.category.create({ data: { name: categoryName } });
    categoryId = cat.id;
  }

  const tx = await prisma.transaction.update({
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
  return NextResponse.json(tx);
}

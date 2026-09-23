import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    include: { institution: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(accounts);
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

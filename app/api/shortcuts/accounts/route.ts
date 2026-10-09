import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = req.headers.get("x-shortcuts-secret");
  const expected = process.env.SHORTCUTS_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const entityName = url.searchParams.get("entity");

  const accounts = await prisma.account.findMany({
    where: {
      isActive: true,
      accountRole: { not: "VIRTUAL" },
      ...(entityName
        ? { entity: { name: { contains: entityName, mode: "insensitive" } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      accountType: true,
      accountRole: true,
      includeInNetWorth: true,
      entity: { select: { name: true } },
    },
    orderBy: [{ entity: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      entity: a.entity?.name ?? null,
      type: a.accountType,
      role: a.accountRole,
      inNetWorth: a.includeInNetWorth,
    })),
    count: accounts.length,
  });
}

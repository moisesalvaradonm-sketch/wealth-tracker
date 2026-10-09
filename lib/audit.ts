import type { PrismaClient } from "@prisma/client";

type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "REVERSE" | "POST";
type EntityType = "Transaction" | "Account" | "Entity";

interface AuditParams {
  prisma: PrismaClient;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
}

export async function writeAudit({
  prisma, entityType, entityId, action, oldData, newData, ipAddress,
}: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
        ipAddress,
      },
    });
  } catch {
    // Audit write is best-effort — never crash the main request
  }
}

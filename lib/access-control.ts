import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { crmAuditLogs, crmRolePermissions, crmRoles, crmUsers } from "../db/schema";

export type AccessActor = { email: string; displayName: string };

export async function requireSystemAdmin(actor: AccessActor) {
  const db = getDb();
  const email = actor.email.trim().toLowerCase();
  const [user] = await db.select().from(crmUsers).where(eq(crmUsers.email, email)).limit(1);
  if (!user) throw new Error("Você não tem permissão para administrar acessos.");

  const [role] = await db.select().from(crmRoles).where(and(eq(crmRoles.id, user.roleId), eq(crmRoles.code, "admin"))).limit(1);
  if (!role || user.status !== "active") throw new Error("Você não tem permissão para administrar acessos.");
  return user;
}

export async function recordAudit(actor: AccessActor, action: string, entityType: string, entityId = "", detail: Record<string, unknown> = {}) {
  const db = getDb();
  await db.insert(crmAuditLogs).values({ id: crypto.randomUUID(), actorEmail: actor.email.toLowerCase(), action, entityType, entityId, detail: JSON.stringify(detail) });
}

export async function requirePermission(actor: AccessActor, permission: string) {
  const db = getDb();
  const email = actor.email.trim().toLowerCase();
  const [user] = await db.select().from(crmUsers).where(eq(crmUsers.email, email)).limit(1);
  if (!user || user.status !== "active") throw new Error("Você não tem permissão para esta operação.");
  const [role] = await db.select({ code: crmRoles.code }).from(crmRoles).where(eq(crmRoles.id, user.roleId)).limit(1);
  if (!role) throw new Error("Perfil de acesso não encontrado.");
  if (role.code === "admin") return user;
  const [allowed] = await db.select({ id: crmRolePermissions.id }).from(crmRolePermissions)
    .where(and(eq(crmRolePermissions.roleId, user.roleId), eq(crmRolePermissions.permission, permission))).limit(1);
  if (!allowed) throw new Error("Você não tem permissão para esta operação.");
  return user;
}

import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { crmAuditLogs, crmRolePermissions, crmRoles, crmUsers } from "../db/schema";

export type AccessActor = { email: string; displayName: string };

export async function requireSystemAdmin(actor: AccessActor) {
  const db = getDb();
  const email = actor.email.trim().toLowerCase();
  let [user] = await db.select().from(crmUsers).where(eq(crmUsers.email, email)).limit(1);

  // Secure first-run bootstrap: only the first authenticated operator becomes admin.
  if (!user) {
    const existing = await db.select({ id: crmUsers.id }).from(crmUsers).limit(1);
    if (existing.length) throw new Error("Você não tem permissão para administrar acessos.");
    await db.insert(crmUsers).values({ id: crypto.randomUUID(), name: actor.displayName, email, roleId: "role_admin", status: "active", updatedAt: new Date() });
    [user] = await db.select().from(crmUsers).where(eq(crmUsers.email, email)).limit(1);
  }

  if (!user) throw new Error("Não foi possível preparar o acesso administrativo.");

  const [role] = await db.select().from(crmRoles).where(and(eq(crmRoles.id, user.roleId), eq(crmRoles.code, "admin"))).limit(1);
  if (!role || user.status !== "active") throw new Error("Você não tem permissão para administrar acessos.");
  return user;
}

export async function recordAudit(actor: AccessActor, action: string, entityType: string, entityId = "", detail: Record<string, unknown> = {}) {
  const db = getDb();
  await db.insert(crmAuditLogs).values({ id: crypto.randomUUID(), actorEmail: actor.email.toLowerCase(), action, entityType, entityId, detail: JSON.stringify(detail) });
}

export async function requirePermission(actor: AccessActor, permission: string) {
  return requireAnyPermission(actor, [permission]);
}

export async function requireAnyPermission(actor: AccessActor, permissions: readonly string[]) {
  if (!permissions.length) throw new Error("Permissão não informada.");
  const db = getDb();
  const email = actor.email.trim().toLowerCase();
  let [user] = await db.select().from(crmUsers).where(eq(crmUsers.email, email)).limit(1);
  if (!user) {
    await requireSystemAdmin(actor);
    [user] = await db.select().from(crmUsers).where(eq(crmUsers.email, email)).limit(1);
  }
  if (!user || user.status !== "active") throw new Error("Você não tem permissão para esta operação.");
  const [role] = await db.select({ code: crmRoles.code }).from(crmRoles).where(eq(crmRoles.id, user.roleId)).limit(1);
  if (!role) throw new Error("Perfil de acesso não encontrado.");
  if (role.code === "admin") return user;
  const grants = await db.select({ permission: crmRolePermissions.permission }).from(crmRolePermissions)
    .where(eq(crmRolePermissions.roleId, user.roleId));
  if (!grants.some((grant) => permissions.includes(grant.permission))) throw new Error("Você não tem permissão para esta operação.");
  return user;
}

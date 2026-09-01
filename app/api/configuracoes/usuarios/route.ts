import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentAppUser } from "../../../app-auth";
import { getDb } from "../../../../db";
import { crmRoles, crmUsers } from "../../../../db/schema";
import { recordAudit, requireSystemAdmin } from "../../../../lib/access-control";
import { createSupabaseAdmin } from "../../../../lib/supabase-admin";

const clean = (value: unknown, max = 180) => typeof value === "string" ? value.trim().slice(0, max) : "";
const actorFrom = async () => {
  const user = await getCurrentAppUser();
  if (!user) throw new Error("Não autorizado.");
  return { email: user.email, displayName: user.displayName };
};

export async function GET() {
  try {
    const actor = await actorFrom();
    await requireSystemAdmin(actor);
    const db = getDb();
    const [users, roles] = await Promise.all([
      db.select({ id: crmUsers.id, name: crmUsers.name, email: crmUsers.email, phone: crmUsers.phone, storeId: crmUsers.storeId, status: crmUsers.status, lastAccessAt: crmUsers.lastAccessAt, roleName: crmRoles.name, roleCode: crmRoles.code }).from(crmUsers).innerJoin(crmRoles, eq(crmUsers.roleId, crmRoles.id)).orderBy(desc(crmUsers.updatedAt)),
      db.select().from(crmRoles).orderBy(crmRoles.name),
    ]);
    return Response.json({ users, roles });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível consultar usuários." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await actorFrom();
    await requireSystemAdmin(actor);
    const raw = await request.json() as Record<string, unknown>;
    const name = clean(raw.name), email = clean(raw.email).toLowerCase(), roleId = clean(raw.roleId, 80);
    if (!name || !email.includes("@") || !roleId) throw new Error("Informe nome, e-mail e perfil.");
    const db = getDb();
    const [role] = await db.select({ id: crmRoles.id }).from(crmRoles).where(eq(crmRoles.id, roleId)).limit(1);
    if (!role) throw new Error("Perfil inválido.");
    const [duplicate] = await db.select({ id: crmUsers.id }).from(crmUsers).where(eq(crmUsers.email, email)).limit(1);
    if (duplicate) throw new Error("Já existe um usuário com este e-mail.");
    const auth = createSupabaseAdmin();
    const redirectTo = `${process.env.AUTOPONTE_APP_URL ?? "https://autoponte-crm.vercel.app"}/nova-senha`;
    const { data: invitation, error: invitationError } = await auth.auth.admin.inviteUserByEmail(email, { redirectTo, data: { name } });
    if (invitationError || !invitation.user) throw new Error(invitationError?.message ?? "Não foi possível enviar o convite.");
    const id = crypto.randomUUID();
    try {
      await db.insert(crmUsers).values({ id, authUserId: invitation.user.id, name, email, phone: clean(raw.phone, 30), storeId: clean(raw.storeId, 100), roleId, status: "invited", updatedAt: new Date() });
    } catch (error) {
      await auth.auth.admin.deleteUser(invitation.user.id);
      throw error;
    }
    await recordAudit(actor, "user.invited", "crm_user", id, { email, roleId });
    revalidatePath("/configuracoes");
    return Response.json({ id, message: "Convite criado. A autenticação será vinculada quando a pessoa entrar no CRM." }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o convite." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await actorFrom();
    const administrator = await requireSystemAdmin(actor);
    const raw = await request.json() as Record<string, unknown>;
    const id = clean(raw.id, 80), status = clean(raw.status, 20);
    if (!id || !["active", "suspended", "inactive"].includes(status)) throw new Error("Status inválido.");
    if (id === administrator.id && status !== "active") throw new Error("Você não pode desativar o seu próprio acesso.");
    const db = getDb();
    await db.update(crmUsers).set({ status, updatedAt: new Date() }).where(eq(crmUsers.id, id));
    await recordAudit(actor, "user.status_changed", "crm_user", id, { status });
    revalidatePath("/configuracoes");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o acesso." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await actorFrom();
    const administrator = await requireSystemAdmin(actor);
    const raw = await request.json() as Record<string, unknown>;
    const id = clean(raw.id, 80);
    if (!id) throw new Error("Usuário inválido.");
    if (id === administrator.id) throw new Error("Você não pode excluir o seu próprio acesso.");
    const db = getDb();
    const [user] = await db.select({ id: crmUsers.id, email: crmUsers.email, authUserId: crmUsers.authUserId }).from(crmUsers).where(eq(crmUsers.id, id)).limit(1);
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.authUserId) {
      const { error } = await createSupabaseAdmin().auth.admin.deleteUser(user.authUserId);
      if (error) throw new Error(`Não foi possível remover o acesso de autenticação: ${error.message}`);
    }
    await db.delete(crmUsers).where(eq(crmUsers.id, id));
    await recordAudit(actor, "user.deleted", "crm_user", id, { email: user.email });
    revalidatePath("/configuracoes");
    return Response.json({ message: "Usuário excluído." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível excluir o usuário." }, { status: 400 });
  }
}

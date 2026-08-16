import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { partners } from "../../../db/partner-schema";
import { crmUsers, sellerProfiles, sellerSpecialties } from "../../../db/schema";
import { recordAudit, requirePermission } from "../../../lib/access-control";

const clean = (value: unknown, max = 180) => typeof value === "string" ? value.trim().slice(0, max) : "";
const specialtiesFrom = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => clean(item, 80)).filter(Boolean))].slice(0, 20)
  : [];

async function actorFrom() {
  const user = await getChatGPTUser();
  if (!user) throw new Error("Não autorizado.");
  const crmUser = await requirePermission({ email: user.email, displayName: user.displayName }, "seller_operations.manage");
  return { actor: { email: user.email, displayName: user.displayName }, crmUser };
}

export async function GET() {
  try {
    await actorFrom();
    const db = getDb();
    const [profiles, users, partnerRows, specialties] = await Promise.all([
      db.select({ profile: sellerProfiles, userName: crmUsers.name, userEmail: crmUsers.email })
        .from(sellerProfiles).innerJoin(crmUsers, eq(sellerProfiles.crmUserId, crmUsers.id)).orderBy(desc(sellerProfiles.updatedAt)),
      db.select({ id: crmUsers.id, name: crmUsers.name, email: crmUsers.email, storeId: crmUsers.storeId }).from(crmUsers).where(eq(crmUsers.status, "active")).orderBy(crmUsers.name),
      db.select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.status, "active")).orderBy(partners.name),
      db.select().from(sellerSpecialties),
    ]);
    const profileUserIds = new Set(profiles.map(({ profile }) => profile.crmUserId));
    return Response.json({
      profiles: profiles.map(({ profile, userName, userEmail }) => ({ ...profile, userName, userEmail, specialties: specialties.filter((item) => item.sellerProfileId === profile.id).map((item) => item.specialty) })),
      availableUsers: users.filter((user) => !profileUserIds.has(user.id)),
      partners: partnerRows,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os vendedores." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const { actor } = await actorFrom();
    const raw = await request.json() as Record<string, unknown>;
    const crmUserId = clean(raw.crmUserId, 80);
    const partnerId = clean(raw.partnerId, 80);
    const status = ["active", "inactive", "blocked"].includes(clean(raw.status, 20)) ? clean(raw.status, 20) : "active";
    const capacity = Math.max(1, Math.min(20, Number(raw.capacity) || 1));
    if (!crmUserId) throw new Error("Selecione um usuário do CRM.");
    const db = getDb();
    const [user] = await db.select({ id: crmUsers.id, status: crmUsers.status }).from(crmUsers).where(eq(crmUsers.id, crmUserId)).limit(1);
    if (!user || user.status !== "active") throw new Error("O vendedor precisa ter um acesso ativo.");
    const [existing] = await db.select({ id: sellerProfiles.id }).from(sellerProfiles).where(eq(sellerProfiles.crmUserId, crmUserId)).limit(1);
    if (existing) throw new Error("Este usuário já possui um perfil de vendedor.");
    const id = crypto.randomUUID();
    const specialties = specialtiesFrom(raw.specialties);
    await db.transaction(async (tx) => {
      await tx.insert(sellerProfiles).values({ id, crmUserId, partnerId, status, capacity, notes: clean(raw.notes, 2000), updatedAt: new Date() });
      if (specialties.length) await tx.insert(sellerSpecialties).values(specialties.map((specialty) => ({ id: crypto.randomUUID(), sellerProfileId: id, specialty })));
    });
    await recordAudit(actor, "seller_profile.created", "seller_profile", id, { crmUserId, partnerId, specialties });
    revalidatePath("/central");
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível criar o perfil de vendedor." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { actor } = await actorFrom();
    const raw = await request.json() as Record<string, unknown>;
    const id = clean(raw.id, 80);
    if (!id) throw new Error("Perfil inválido.");
    const status = clean(raw.status, 20);
    const availabilityStatus = clean(raw.availabilityStatus, 20);
    if (!["active", "inactive", "blocked"].includes(status) && !["available", "unavailable"].includes(availabilityStatus)) throw new Error("Atualização inválida.");
    const updates = status ? { status, updatedAt: new Date() } : { availabilityStatus, updatedAt: new Date() };
    await getDb().update(sellerProfiles).set(updates).where(eq(sellerProfiles.id, id));
    await recordAudit(actor, "seller_profile.updated", "seller_profile", id, updates);
    revalidatePath("/central");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o vendedor." }, { status: 400 });
  }
}

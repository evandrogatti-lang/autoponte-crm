import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { crmUsers, opportunityEvents, sellerAppointments, sellerAssignments, sellerProfiles, sellerSpecialties, tradeIns } from "../../../db/schema";
import { recordAudit, requirePermission } from "../../../lib/access-control";
import {
  activeAssignmentStatuses,
  canAssignWithoutExplicitReopen,
  centralQueueLeadStatuses,
  isActiveAssignmentStatus,
  shouldKeepOpportunityInCentralQueue,
} from "../../../lib/central-assignment-lifecycle";
import { isSellerEligibleForOpportunity } from "../../../lib/seller-eligibility";

const clean = (value: unknown, max = 180) => typeof value === "string" ? value.trim().slice(0, max) : "";

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
    const [baseQueueOpportunities, profiles, assignments, appointments, specialties] = await Promise.all([
      db.select({ id: tradeIns.id, name: tradeIns.name, city: tradeIns.city, brand: tradeIns.brand, model: tradeIns.model, status: tradeIns.status, nextFollowUp: tradeIns.nextFollowUp, createdAt: tradeIns.createdAt }).from(tradeIns).where(inArray(tradeIns.status, [...centralQueueLeadStatuses])).orderBy(desc(tradeIns.createdAt)).limit(100),
      db.select({ profile: sellerProfiles, userName: crmUsers.name, userEmail: crmUsers.email }).from(sellerProfiles).innerJoin(crmUsers, eq(sellerProfiles.crmUserId, crmUsers.id)).where(eq(sellerProfiles.status, "active")).orderBy(crmUsers.name),
      db.select().from(sellerAssignments).orderBy(desc(sellerAssignments.updatedAt)).limit(500),
      db.select().from(sellerAppointments).orderBy(sellerAppointments.startsAt).limit(200),
      db.select().from(sellerSpecialties).where(eq(sellerSpecialties.active, true)),
    ]);
    const latestAssignmentByOpportunity = new Map<string, typeof assignments[number]>();
    for (const assignment of assignments) {
      if (!latestAssignmentByOpportunity.has(assignment.opportunityId)) latestAssignmentByOpportunity.set(assignment.opportunityId, assignment);
    }
    const activeAssignmentOpportunityIds = [...new Set(assignments.filter((assignment) => isActiveAssignmentStatus(assignment.status)).map((assignment) => assignment.opportunityId))];
    const activeAssignmentOpportunitySet = new Set(activeAssignmentOpportunityIds);
    const baseQueueIds = new Set(baseQueueOpportunities.map((opportunity) => opportunity.id));
    const missingOpportunityIds = activeAssignmentOpportunityIds.filter((id) => !baseQueueIds.has(id));
    const activeAssignmentOpportunities = missingOpportunityIds.length
      ? await db.select({ id: tradeIns.id, name: tradeIns.name, city: tradeIns.city, brand: tradeIns.brand, model: tradeIns.model, status: tradeIns.status, nextFollowUp: tradeIns.nextFollowUp, createdAt: tradeIns.createdAt }).from(tradeIns).where(inArray(tradeIns.id, missingOpportunityIds))
      : [];
    const opportunities = [...baseQueueOpportunities, ...activeAssignmentOpportunities]
      .filter((opportunity) => shouldKeepOpportunityInCentralQueue(
        latestAssignmentByOpportunity.get(opportunity.id)?.status ?? null,
        activeAssignmentOpportunitySet.has(opportunity.id),
      ))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const specialtiesBySeller = new Map<string, string[]>();
    for (const specialty of specialties) {
      const values = specialtiesBySeller.get(specialty.sellerProfileId) ?? [];
      values.push(specialty.specialty);
      specialtiesBySeller.set(specialty.sellerProfileId, values);
    }
    const activeAssignmentsBySeller = assignments.reduce((accumulator, assignment) => {
      if (!isActiveAssignmentStatus(assignment.status)) return accumulator;
      accumulator.set(assignment.sellerProfileId, (accumulator.get(assignment.sellerProfileId) ?? 0) + 1);
      return accumulator;
    }, new Map<string, number>());
    const sellers = profiles.map(({ profile, userName, userEmail }) => ({
      ...profile,
      userName,
      userEmail,
      specialties: specialtiesBySeller.get(profile.id) ?? [],
      activeAssignments: activeAssignmentsBySeller.get(profile.id) ?? 0,
    }));
    return Response.json({
      opportunities: opportunities.map((opportunity) => ({
        ...opportunity,
        assignment: assignments.find((item) => item.opportunityId === opportunity.id && isActiveAssignmentStatus(item.status)) ?? null,
        assignmentHistory: assignments.filter((item) => item.opportunityId === opportunity.id),
        eligibleSellerIds: sellers
          .filter((seller) => isSellerEligibleForOpportunity(
            seller,
            { brand: opportunity.brand, model: opportunity.model },
          ))
          .map((seller) => seller.id),
      })),
      sellers,
      appointments,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a Central de Atendimento." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const { actor, crmUser } = await actorFrom();
    const raw = await request.json() as Record<string, unknown>;
    const action = clean(raw.action, 30);
    const opportunityId = clean(raw.opportunityId, 80);
    const db = getDb();
    if (!opportunityId) throw new Error("Oportunidade inválida.");
    const [opportunity] = await db.select({ id: tradeIns.id, name: tradeIns.name, brand: tradeIns.brand, model: tradeIns.model }).from(tradeIns).where(eq(tradeIns.id, opportunityId)).limit(1);
    if (!opportunity) throw new Error("Oportunidade não encontrada.");

    if (action === "assign") {
      const sellerProfileId = clean(raw.sellerProfileId, 80);
      const reason = clean(raw.reason, 500) || "Atribuição manual assistida";
      const [latestAssignment] = await db.select({ status: sellerAssignments.status }).from(sellerAssignments).where(eq(sellerAssignments.opportunityId, opportunityId)).orderBy(desc(sellerAssignments.updatedAt)).limit(1);
      if (!canAssignWithoutExplicitReopen(latestAssignment?.status ?? null)) throw new Error("Esta oportunidade já foi concluída. Reabra ou reencaminhe explicitamente antes de nova atribuição.");
      const [seller] = await db.select().from(sellerProfiles).where(and(eq(sellerProfiles.id, sellerProfileId), eq(sellerProfiles.status, "active"))).limit(1);
      if (!seller || seller.availabilityStatus !== "available") throw new Error("Vendedor indisponível para atribuição.");
      const activeAssignments = await db.select({ id: sellerAssignments.id }).from(sellerAssignments).where(and(eq(sellerAssignments.sellerProfileId, sellerProfileId), inArray(sellerAssignments.status, [...activeAssignmentStatuses])));
      if (activeAssignments.length >= seller.capacity) throw new Error("A capacidade atual deste vendedor foi atingida.");
      const specialtyRows = await db.select({ specialty: sellerSpecialties.specialty }).from(sellerSpecialties).where(and(eq(sellerSpecialties.sellerProfileId, sellerProfileId), eq(sellerSpecialties.active, true)));
      if (!isSellerEligibleForOpportunity({
        availabilityStatus: seller.availabilityStatus,
        capacity: seller.capacity,
        specialties: specialtyRows.map((item) => item.specialty),
        activeAssignments: activeAssignments.length,
      }, { brand: opportunity.brand, model: opportunity.model })) throw new Error("A especialidade do vendedor não cobre esta oportunidade.");
      const now = new Date();
      const assignmentId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.update(sellerAssignments).set({ status: "reassigned", reason: "Substituída por nova atribuição", updatedAt: now }).where(and(eq(sellerAssignments.opportunityId, opportunityId), inArray(sellerAssignments.status, [...activeAssignmentStatuses])));
        await tx.insert(sellerAssignments).values({ id: assignmentId, opportunityId, sellerProfileId, assignedByUserId: crmUser.id, reason, assignedAt: now, updatedAt: now });
        await tx.insert(opportunityEvents).values({ id: crypto.randomUUID(), opportunityId, eventType: "seller_assigned", title: "Atendimento atribuído", description: reason, metadata: JSON.stringify({ assignmentId, sellerProfileId }), actorName: actor.displayName, actorEmail: actor.email, createdAt: now });
      });
      await recordAudit(actor, "seller_assignment.created", "seller_assignment", assignmentId, { opportunityId, sellerProfileId, reason });
      revalidatePath("/crm"); revalidatePath(`/oportunidades/${opportunityId}`); revalidatePath("/central");
      return Response.json({ id: assignmentId }, { status: 201 });
    }

    const assignmentId = clean(raw.assignmentId, 80);
    const [assignment] = await db.select().from(sellerAssignments).where(and(eq(sellerAssignments.id, assignmentId), eq(sellerAssignments.opportunityId, opportunityId))).limit(1);
    if (!assignment) throw new Error("Atribuição não encontrada.");
    const now = new Date();
    if (action === "appointment") {
      const startsAt = new Date(clean(raw.startsAt, 40));
      const endsAt = new Date(clean(raw.endsAt, 40));
      if (Number.isNaN(startsAt.valueOf()) || Number.isNaN(endsAt.valueOf()) || endsAt <= startsAt) throw new Error("Informe um horário de agenda válido.");
      const [conflict] = await db.select({ id: sellerAppointments.id }).from(sellerAppointments).where(and(eq(sellerAppointments.sellerProfileId, assignment.sellerProfileId), eq(sellerAppointments.status, "scheduled"))).limit(1);
      if (conflict) throw new Error("Já existe um compromisso ativo para este vendedor.");
      const appointmentId = crypto.randomUUID();
      await db.insert(sellerAppointments).values({ id: appointmentId, opportunityId, sellerProfileId: assignment.sellerProfileId, startsAt, endsAt, source: clean(raw.source, 40) || "autoponte", note: clean(raw.note, 1000) });
      await db.insert(opportunityEvents).values({ id: crypto.randomUUID(), opportunityId, eventType: "appointment_created", title: "Atendimento agendado", description: startsAt.toLocaleString("pt-BR"), metadata: JSON.stringify({ appointmentId }), actorName: actor.displayName, actorEmail: actor.email, createdAt: now });
      await recordAudit(actor, "seller_appointment.created", "seller_appointment", appointmentId, { opportunityId, assignmentId });
      revalidatePath("/central");
      return Response.json({ id: appointmentId }, { status: 201 });
    }

    const updates = action === "accept" ? { status: "accepted", acceptedAt: now, updatedAt: now }
      : action === "contact" ? { status: "contacted", firstContactAt: assignment.firstContactAt ?? now, updatedAt: now }
      : action === "complete" ? { status: "completed", outcome: clean(raw.outcome, 80) || "completed", completedAt: now, updatedAt: now }
      : null;
    if (!updates) throw new Error("Ação de atendimento inválida.");
    await db.transaction(async (tx) => {
      await tx.update(sellerAssignments).set(updates).where(eq(sellerAssignments.id, assignmentId));
      await tx.insert(opportunityEvents).values({ id: crypto.randomUUID(), opportunityId, eventType: `seller_${action}`, title: action === "accept" ? "Atendimento aceito" : action === "contact" ? "Primeiro contato registrado" : "Atendimento concluído", description: clean(raw.note, 500), metadata: JSON.stringify({ assignmentId, outcome: clean(raw.outcome, 80) }), actorName: actor.displayName, actorEmail: actor.email, createdAt: now });
    });
    await recordAudit(actor, `seller_assignment.${action}`, "seller_assignment", assignmentId, { opportunityId, outcome: clean(raw.outcome, 80) });
    revalidatePath("/crm"); revalidatePath(`/oportunidades/${opportunityId}`); revalidatePath("/central");
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar o atendimento." }, { status: 400 });
  }
}
